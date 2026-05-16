import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";
import { audit } from "../middleware/audit";
import { liveFilter, compFilter, softDelete } from "../db/query-helpers";

// Question-bank authoring API (Wave 6 Phase 1). Every route is question_maker-
// gated; comp-scoped routes additionally require an `accesses` row linking the
// caller to the competition. Mounted at /api.
//   GET    /question-bank/competitions
//   GET/POST/PUT/DELETE  /question-bank/{subjects,topics,subtopics}
//   GET/POST/PUT/DELETE  /question-bank/questions  (+ answers + topic tags)

const router = Router();
router.use(authMiddleware);
router.use(requireRole("question_maker"));

// ── Helpers ───────────────────────────────────────────────────────────────

// The caller must hold an `accesses` grant for the competition.
async function hasCompAccess(userId: string, compId: string): Promise<boolean> {
  const r = await pool.query(
    "SELECT 1 FROM accesses WHERE comp_id = $1 AND user_id = $2",
    [compId, userId]
  );
  return r.rows.length > 0;
}

// Resolve a taxonomy/question row's comp_id, then check access. Returns the
// comp_id, or null if the row is missing / soft-deleted / not accessible.
async function rowCompIfAccessible(
  table: "subjects" | "topics" | "subtopics" | "questions",
  id: string,
  userId: string
): Promise<string | null> {
  const r = await pool.query(
    `SELECT comp_id FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (r.rows.length === 0) return null;
  const compId = r.rows[0].comp_id as string;
  return (await hasCompAccess(userId, compId)) ? compId : null;
}

// ── GET /api/question-bank/competitions ───────────────────────────────────
// The competitions the caller may author for, with their granted grades.
router.get("/question-bank/competitions", async (req: Request, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT c.id, c.name, c.slug, a.grades
         FROM accesses a
         JOIN competitions c ON c.id = a.comp_id
        WHERE a.user_id = $1
        ORDER BY c.name ASC`,
      [req.userId]
    );
    res.json(
      r.rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug ?? null,
        grades: Array.isArray(c.grades) ? c.grades : [],
      }))
    );
  } catch (err) {
    console.error("List question-bank competitions error:", err);
    res.status(500).json({ message: "Failed to load competitions" });
  }
});

// ── Taxonomy (subjects / topics / subtopics) ──────────────────────────────
// The three share one shape: id, comp_id, name, description (+ a parent FK on
// topics/subtopics). One handler set, the table picked from this fixed config.
interface TaxonomyCfg {
  slug: "subjects" | "topics" | "subtopics";
  table: "subjects" | "topics" | "subtopics";
  parentCol?: "subject_id" | "topic_id";
  parentTable?: "subjects" | "topics";
  parentParam?: "subjectId" | "topicId";
}

const TAXONOMIES: TaxonomyCfg[] = [
  { slug: "subjects" as const, table: "subjects" as const },
  { slug: "topics" as const, table: "topics" as const, parentCol: "subject_id" as const, parentTable: "subjects" as const, parentParam: "subjectId" as const },
  { slug: "subtopics" as const, table: "subtopics" as const, parentCol: "topic_id" as const, parentTable: "topics" as const, parentParam: "topicId" as const },
];

function mapTaxonomyRow(r: any, parentCol?: string) {
  return {
    id: r.id,
    compId: r.comp_id,
    ...(parentCol ? { parentId: r[parentCol] } : {}),
    name: r.name,
    description: r.description ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

for (const t of TAXONOMIES) {
  const cols = `id, comp_id, ${t.parentCol ? `${t.parentCol}, ` : ""}name, description, created_at, updated_at`;

  // GET /question-bank/{slug}?compId=&{parentParam}=
  router.get(`/question-bank/${t.slug}`, async (req: Request, res: Response) => {
    try {
      const compId = String(req.query.compId ?? "");
      if (!compId || !(await hasCompAccess(req.userId!, compId))) {
        res.status(403).json({ message: "No access to this competition" });
        return;
      }
      const params: unknown[] = [compId];
      let where = `${compFilter()} AND ${liveFilter()}`;
      if (t.parentCol && t.parentParam && req.query[t.parentParam]) {
        params.push(String(req.query[t.parentParam]));
        where += ` AND ${t.parentCol} = $${params.length}`;
      }
      const r = await pool.query(
        `SELECT ${cols} FROM ${t.table} WHERE ${where} ORDER BY name ASC`,
        params
      );
      res.json(r.rows.map((row) => mapTaxonomyRow(row, t.parentCol)));
    } catch (err) {
      console.error(`List ${t.slug} error:`, err);
      res.status(500).json({ message: `Failed to load ${t.slug}` });
    }
  });

  // POST /question-bank/{slug}
  router.post(
    `/question-bank/${t.slug}`,
    audit({ action: `question_bank.${t.slug}.create`, resourceType: t.slug }),
    async (req: Request, res: Response) => {
      try {
        const compId = String(req.body?.compId ?? "");
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
        const description =
          typeof req.body?.description === "string" ? req.body.description.trim() || null : null;
        if (!compId || !(await hasCompAccess(req.userId!, compId))) {
          res.status(403).json({ message: "No access to this competition" });
          return;
        }
        if (!name) {
          res.status(400).json({ message: "name is required" });
          return;
        }
        let parentId: string | null = null;
        if (t.parentCol) {
          parentId = String(req.body?.parentId ?? "");
          if (!parentId) {
            res.status(400).json({ message: "parentId is required" });
            return;
          }
          // Parent must be a live row of the same competition.
          const parent = await pool.query(
            `SELECT 1 FROM ${t.parentTable} WHERE id = $1 AND comp_id = $2 AND deleted_at IS NULL`,
            [parentId, compId]
          );
          if (parent.rows.length === 0) {
            res.status(400).json({ message: "parentId not found in this competition" });
            return;
          }
        }
        const insertCols = `comp_id, ${t.parentCol ? `${t.parentCol}, ` : ""}name, description`;
        const insertVals = t.parentCol ? "$1, $2, $3, $4" : "$1, $2, $3";
        const values = t.parentCol ? [compId, parentId, name, description] : [compId, name, description];
        const inserted = await pool.query(
          `INSERT INTO ${t.table} (${insertCols}) VALUES (${insertVals}) RETURNING ${cols}`,
          values
        );
        res.status(201).json(mapTaxonomyRow(inserted.rows[0], t.parentCol));
      } catch (err) {
        console.error(`Create ${t.slug} error:`, err);
        res.status(500).json({ message: `Failed to create ${t.slug}` });
      }
    }
  );

  // PUT /question-bank/{slug}/:id
  router.put(
    `/question-bank/${t.slug}/:id`,
    audit({ action: `question_bank.${t.slug}.update`, resourceType: t.slug, resourceIdParam: "id" }),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        if (!(await rowCompIfAccessible(t.table, id, req.userId!))) {
          res.status(404).json({ message: `${t.slug} not found` });
          return;
        }
        const sets: string[] = [];
        const values: unknown[] = [];
        let i = 1;
        if (typeof req.body?.name === "string") {
          sets.push(`name = $${i++}`);
          values.push(req.body.name.trim());
        }
        if (typeof req.body?.description === "string" || req.body?.description === null) {
          sets.push(`description = $${i++}`);
          values.push(req.body.description ? String(req.body.description).trim() : null);
        }
        if (sets.length === 0) {
          res.status(400).json({ message: "Nothing to update" });
          return;
        }
        sets.push("updated_at = now()");
        values.push(id);
        const updated = await pool.query(
          `UPDATE ${t.table} SET ${sets.join(", ")} WHERE id = $${i} RETURNING ${cols}`,
          values
        );
        res.json(mapTaxonomyRow(updated.rows[0], t.parentCol));
      } catch (err) {
        console.error(`Update ${t.slug} error:`, err);
        res.status(500).json({ message: `Failed to update ${t.slug}` });
      }
    }
  );

  // DELETE /question-bank/{slug}/:id
  router.delete(
    `/question-bank/${t.slug}/:id`,
    audit({ action: `question_bank.${t.slug}.delete`, resourceType: t.slug, resourceIdParam: "id" }),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        if (!(await rowCompIfAccessible(t.table, id, req.userId!))) {
          res.status(404).json({ message: `${t.slug} not found` });
          return;
        }
        await softDelete(t.table, id);
        res.json({ message: `${t.slug} removed` });
      } catch (err) {
        console.error(`Delete ${t.slug} error:`, err);
        res.status(500).json({ message: `Failed to delete ${t.slug}` });
      }
    }
  );
}

// ── Questions ─────────────────────────────────────────────────────────────
const QUESTION_TYPES = ["multiple_choice", "short_answer"] as const;
type QuestionType = (typeof QUESTION_TYPES)[number];

async function loadQuestion(id: string) {
  const q = await pool.query(
    `SELECT id, comp_id, code, writer_id, approver_id, level, grades, type,
            cognitive, approved_at, content, explanation, status, is_bonus,
            created_at, updated_at
       FROM questions WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (q.rows.length === 0) return null;
  const row = q.rows[0];
  const answers = await pool.query(
    `SELECT id, content, is_correct FROM answers
      WHERE question_id = $1 AND ${liveFilter()} ORDER BY created_at ASC`,
    [id]
  );
  const topics = await pool.query(
    `SELECT topic_id, subtopic_id FROM question_topics WHERE question_id = $1`,
    [id]
  );
  return {
    id: row.id,
    compId: row.comp_id,
    code: row.code,
    writerId: row.writer_id,
    approverId: row.approver_id ?? null,
    approvedAt: row.approved_at ?? null,
    type: row.type,
    level: row.level ?? null,
    cognitive: row.cognitive ?? null,
    grades: Array.isArray(row.grades) ? row.grades : [],
    content: row.content ?? "",
    explanation: row.explanation ?? null,
    status: row.status,
    isBonus: row.is_bonus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answers: answers.rows.map((a) => ({ id: a.id, content: a.content ?? "", isCorrect: a.is_correct })),
    topics: topics.rows.map((qt) => ({ topicId: qt.topic_id, subtopicId: qt.subtopic_id ?? null })),
  };
}

// GET /api/question-bank/questions?compId=&status=&subjectId=&grade=
router.get("/question-bank/questions", async (req: Request, res: Response) => {
  try {
    const compId = String(req.query.compId ?? "");
    if (!compId || !(await hasCompAccess(req.userId!, compId))) {
      res.status(403).json({ message: "No access to this competition" });
      return;
    }
    const params: unknown[] = [compId];
    let where = `${compFilter("q")} AND ${liveFilter("q")}`;
    if (req.query.status) {
      params.push(String(req.query.status));
      where += ` AND q.status = $${params.length}`;
    }
    if (req.query.grade) {
      params.push(JSON.stringify([String(req.query.grade)]));
      where += ` AND q.grades @> $${params.length}::jsonb`;
    }
    if (req.query.subjectId) {
      params.push(String(req.query.subjectId));
      where += ` AND EXISTS (SELECT 1 FROM question_topics qt JOIN topics t ON t.id = qt.topic_id
                              WHERE qt.question_id = q.id AND t.subject_id = $${params.length})`;
    }
    const r = await pool.query(
      `SELECT q.id, q.code, q.type, q.level, q.grades, q.status, q.is_bonus,
              q.content, q.writer_id, q.created_at, q.updated_at
         FROM questions q
        WHERE ${where}
        ORDER BY q.created_at DESC`,
      params
    );
    res.json(
      r.rows.map((q) => ({
        id: q.id,
        code: q.code,
        type: q.type,
        level: q.level ?? null,
        grades: Array.isArray(q.grades) ? q.grades : [],
        status: q.status,
        isBonus: q.is_bonus,
        content: q.content ?? "",
        writerId: q.writer_id,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      }))
    );
  } catch (err) {
    console.error("List questions error:", err);
    res.status(500).json({ message: "Failed to load questions" });
  }
});

// GET /api/question-bank/questions/:id
router.get("/question-bank/questions/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const question = await loadQuestion(id);
    if (!question || !(await hasCompAccess(req.userId!, question.compId))) {
      res.status(404).json({ message: "Question not found" });
      return;
    }
    res.json(question);
  } catch (err) {
    console.error("Get question error:", err);
    res.status(500).json({ message: "Failed to load question" });
  }
});

// Validates + normalises the answers/topics payload for a question.
function parseQuestionBody(body: any): { error?: string; data?: any } {
  const type: QuestionType = body?.type === "short_answer" ? "short_answer" : "multiple_choice";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return { error: "content is required" };

  const rawAnswers = Array.isArray(body?.answers) ? body.answers : [];
  const answers = rawAnswers
    .map((a: any) => ({
      content: typeof a?.content === "string" ? a.content.trim() : "",
      isCorrect: !!a?.isCorrect,
    }))
    .filter((a: any) => a.content);
  if (type === "multiple_choice") {
    if (answers.length < 2) return { error: "A multiple-choice question needs at least 2 options" };
    if (!answers.some((a: any) => a.isCorrect)) return { error: "Mark at least one option correct" };
  } else {
    // Short answer — one answer-key row.
    if (answers.length !== 1) return { error: "A short-answer question needs exactly one answer key" };
    answers[0].isCorrect = true;
  }

  const topics = (Array.isArray(body?.topics) ? body.topics : [])
    .map((t: any) => ({
      topicId: typeof t?.topicId === "string" ? t.topicId : "",
      subtopicId: typeof t?.subtopicId === "string" && t.subtopicId ? t.subtopicId : null,
    }))
    .filter((t: any) => t.topicId);

  return {
    data: {
      type,
      content,
      level: typeof body?.level === "string" ? body.level.trim() || null : null,
      cognitive: typeof body?.cognitive === "string" ? body.cognitive.trim() || null : null,
      grades: Array.isArray(body?.grades) ? body.grades.map(String) : [],
      explanation: typeof body?.explanation === "string" ? body.explanation.trim() || null : null,
      isBonus: !!body?.isBonus,
      answers,
      topics,
    },
  };
}

// POST /api/question-bank/questions
router.post(
  "/question-bank/questions",
  audit({ action: "question_bank.question.create", resourceType: "question" }),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const compId = String(req.body?.compId ?? "");
      if (!compId || !(await hasCompAccess(req.userId!, compId))) {
        res.status(403).json({ message: "No access to this competition" });
        return;
      }
      const parsed = parseQuestionBody(req.body);
      if (parsed.error || !parsed.data) {
        res.status(400).json({ message: parsed.error });
        return;
      }
      const d = parsed.data;

      await client.query("BEGIN");
      // Per-competition sequential code (Q-001, Q-002, …).
      const count = await client.query(
        "SELECT COUNT(*)::int AS n FROM questions WHERE comp_id = $1",
        [compId]
      );
      const code = `Q-${String(Number(count.rows[0].n) + 1).padStart(3, "0")}`;

      const inserted = await client.query(
        `INSERT INTO questions
           (comp_id, code, writer_id, type, level, cognitive, grades, content, explanation, is_bonus, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,'draft')
         RETURNING id`,
        [compId, code, req.userId, d.type, d.level, d.cognitive, JSON.stringify(d.grades), d.content, d.explanation, d.isBonus]
      );
      const questionId = inserted.rows[0].id as string;

      for (const a of d.answers) {
        await client.query(
          `INSERT INTO answers (comp_id, question_id, content, is_correct) VALUES ($1,$2,$3,$4)`,
          [compId, questionId, a.content, a.isCorrect]
        );
      }
      for (const t of d.topics) {
        await client.query(
          `INSERT INTO question_topics (question_id, topic_id, subtopic_id) VALUES ($1,$2,$3)
           ON CONFLICT (question_id, topic_id) DO NOTHING`,
          [questionId, t.topicId, t.subtopicId]
        );
      }
      await client.query("COMMIT");
      res.status(201).json(await loadQuestion(questionId));
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Create question error:", err);
      res.status(500).json({ message: "Failed to create question" });
    } finally {
      client.release();
    }
  }
);

// PUT /api/question-bank/questions/:id — only the writer may edit, only in draft.
router.put(
  "/question-bank/questions/:id",
  audit({ action: "question_bank.question.update", resourceType: "question", resourceIdParam: "id" }),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const id = String(req.params.id);
      const existing = await loadQuestion(id);
      if (!existing || !(await hasCompAccess(req.userId!, existing.compId))) {
        res.status(404).json({ message: "Question not found" });
        return;
      }
      if (existing.writerId !== req.userId) {
        res.status(403).json({ message: "Only the question's writer can edit it" });
        return;
      }
      if (existing.status !== "draft") {
        res.status(409).json({ message: "Only draft questions can be edited" });
        return;
      }
      const parsed = parseQuestionBody(req.body);
      if (parsed.error || !parsed.data) {
        res.status(400).json({ message: parsed.error });
        return;
      }
      const d = parsed.data;

      await client.query("BEGIN");
      await client.query(
        `UPDATE questions
            SET type=$1, level=$2, cognitive=$3, grades=$4::jsonb, content=$5,
                explanation=$6, is_bonus=$7, updated_at=now()
          WHERE id=$8`,
        [d.type, d.level, d.cognitive, JSON.stringify(d.grades), d.content, d.explanation, d.isBonus, id]
      );
      // Replace the child answers + topic tags.
      await client.query("DELETE FROM answers WHERE question_id = $1", [id]);
      await client.query("DELETE FROM question_topics WHERE question_id = $1", [id]);
      for (const a of d.answers) {
        await client.query(
          `INSERT INTO answers (comp_id, question_id, content, is_correct) VALUES ($1,$2,$3,$4)`,
          [existing.compId, id, a.content, a.isCorrect]
        );
      }
      for (const t of d.topics) {
        await client.query(
          `INSERT INTO question_topics (question_id, topic_id, subtopic_id) VALUES ($1,$2,$3)
           ON CONFLICT (question_id, topic_id) DO NOTHING`,
          [id, t.topicId, t.subtopicId]
        );
      }
      await client.query("COMMIT");
      res.json(await loadQuestion(id));
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Update question error:", err);
      res.status(500).json({ message: "Failed to update question" });
    } finally {
      client.release();
    }
  }
);

// DELETE /api/question-bank/questions/:id — writer-only, draft-only.
router.delete(
  "/question-bank/questions/:id",
  audit({ action: "question_bank.question.delete", resourceType: "question", resourceIdParam: "id" }),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const existing = await loadQuestion(id);
      if (!existing || !(await hasCompAccess(req.userId!, existing.compId))) {
        res.status(404).json({ message: "Question not found" });
        return;
      }
      if (existing.writerId !== req.userId) {
        res.status(403).json({ message: "Only the question's writer can delete it" });
        return;
      }
      await softDelete("questions", id);
      res.json({ message: "Question removed" });
    } catch (err) {
      console.error("Delete question error:", err);
      res.status(500).json({ message: "Failed to delete question" });
    }
  }
);

export default router;
