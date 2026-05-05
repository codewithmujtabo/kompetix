import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";
import * as pushService from "../services/push.service";

const router = Router();
router.use(authMiddleware);

// ── GET /api/registrations ────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM registrations WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );

    const registrations = result.rows.map((r) => ({
      id: r.id,
      compId: r.comp_id,
      status: r.status,
      meta: r.meta,
      registrationNumber: r.registration_number,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json(registrations);
  } catch (err) {
    console.error("List registrations error:", err);
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
});

// ── GET /api/registrations/:id ──────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const registrationResult = await pool.query(
      `SELECT
         r.id,
         r.comp_id,
         r.status,
         r.meta,
         r.registration_number,
         r.profile_snapshot,
         r.created_at,
         r.updated_at,
         r.reviewed_at,
         r.rejection_reason,
         c.name as competition_name,
         c.organizer_name,
         c.category,
         c.grade_level,
         c.fee,
         c.description,
         c.detailed_description,
         c.website_url,
         c.competition_date,
         c.reg_close_date,
         c.required_docs,
         c.participant_instructions,
         c.post_payment_redirect_url,
         p.id as payment_id,
         p.payment_status,
         p.payment_method,
         p.amount as payment_amount,
         p.payment_proof_url,
         p.proof_submitted_at
       FROM registrations r
       JOIN competitions c ON c.id = r.comp_id
       LEFT JOIN payments p ON p.registration_id = r.id
       WHERE r.id = $1 AND r.user_id = $2
       ORDER BY p.created_at DESC NULLS LAST
       LIMIT 1`,
      [req.params.id, req.userId]
    );

    if (registrationResult.rows.length === 0) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    const row = registrationResult.rows[0];
    const roundsTableExists = await pool.query(
      "SELECT to_regclass('public.competition_rounds') as table_name"
    );
    const hasCompetitionRounds = !!roundsTableExists.rows[0]?.table_name;
    const rounds = hasCompetitionRounds
      ? (
          await pool.query(
            `SELECT
              id,
              round_name,
              round_type,
              start_date,
              registration_deadline,
              exam_date,
              results_date,
              fee,
              location,
              round_order
            FROM competition_rounds
            WHERE comp_id = $1
            ORDER BY round_order ASC, created_at ASC`,
            [row.comp_id]
          )
        ).rows
      : [];

    res.json({
      registration: {
        id: row.id,
        compId: row.comp_id,
        status: row.status,
        meta: row.meta,
        registrationNumber: row.registration_number,
        profileSnapshot: row.profile_snapshot,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reviewedAt: row.reviewed_at,
        rejectionReason: row.rejection_reason,
        competitionName: row.competition_name,
        competition: {
          id: row.comp_id,
          name: row.competition_name,
          organizerName: row.organizer_name,
          category: row.category,
          gradeLevel: row.grade_level,
          fee: row.fee,
          description: row.description,
          detailedDescription: row.detailed_description,
          websiteUrl: row.website_url,
          competitionDate: row.competition_date,
          regCloseDate: row.reg_close_date,
          requiredDocs: row.required_docs ?? [],
          participantInstructions: row.participant_instructions,
          post_payment_redirect_url: row.post_payment_redirect_url ?? null,
          rounds: rounds.map((round) => ({
            id: round.id,
            roundName: round.round_name,
            roundType: round.round_type,
            startDate: round.start_date,
            registrationDeadline: round.registration_deadline,
            examDate: round.exam_date,
            resultsDate: round.results_date,
            fee: round.fee,
            location: round.location,
            roundOrder: round.round_order,
          })),
        },
        payment: row.payment_id
          ? {
              id: row.payment_id,
              status: row.payment_status,
              method: row.payment_method,
              amount: row.payment_amount,
              proofUrl: row.payment_proof_url,
              proofSubmittedAt: row.proof_submitted_at,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Get registration detail error:", err);
    res.status(500).json({ message: "Failed to fetch registration detail" });
  }
});

// ── POST /api/registrations ───────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const { id, compId, meta, referralCode } = req.body;

    if (!id || !compId) {
      res.status(400).json({ message: "id and compId are required" });
      return;
    }

    // Look up the competition fee to decide initial status
    const compResult = await pool.query(
      "SELECT fee FROM competitions WHERE id = $1",
      [compId]
    );

    if (compResult.rows.length === 0) {
      res.status(404).json({ message: "Competition not found" });
      return;
    }

    // All registrations start as pending_approval — admin reviews before payment
    const isFree = compResult.rows[0].fee === 0;
    const initialStatus = "pending_approval";

    // T6: Capture profile snapshot at registration time
    const profileResult = await pool.query(
      `SELECT u.full_name, u.email, u.phone, u.city, u.province, u.role,
              s.school, s.grade, s.nisn,
              p.child_name, p.child_school, p.child_grade
       FROM users u
       LEFT JOIN students s ON s.id = u.id
       LEFT JOIN parents p ON p.id = u.id
       WHERE u.id = $1`,
      [req.userId]
    );
    const prof = profileResult.rows[0] ?? {};
    const profileSnapshot = {
      fullName: prof.full_name ?? null,
      email: prof.email ?? null,
      phone: prof.phone ?? null,
      city: prof.city ?? null,
      province: prof.province ?? null,
      role: prof.role ?? null,
      ...(prof.school && { school: prof.school }),
      ...(prof.grade && { grade: prof.grade }),
      ...(prof.nisn && { nisn: prof.nisn }),
      ...(prof.child_name && { childName: prof.child_name }),
      ...(prof.child_school && { childSchool: prof.child_school }),
      ...(prof.child_grade && { childGrade: prof.child_grade }),
    };

    // T5: registration_number is auto-generated by DB sequence via DEFAULT
    // T24: referral_code captured from request body (optional)
    const insertResult = await pool.query(
      `INSERT INTO registrations (id, user_id, comp_id, status, meta, profile_snapshot, referral_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING registration_number`,
      [id, req.userId, compId, initialStatus, meta ? JSON.stringify(meta) : null, JSON.stringify(profileSnapshot), referralCode ?? null]
    );
    const registrationNumber = insertResult.rows[0]?.registration_number ?? null;

    // Get competition + student details for notifications
    const detailsResult = await pool.query(
      `SELECT c.name as competition_name, u.full_name as student_name
       FROM competitions c
       JOIN users u ON u.id = $2
       WHERE c.id = $1`,
      [compId, req.userId]
    );
    const competitionName = detailsResult.rows[0]?.competition_name || "Competition";
    const studentName = detailsResult.rows[0]?.student_name || "Your child";

    // Create notification for registration
    await pushService.sendPushNotification(
      req.userId!,
      "Registration Submitted!",
      `Your registration for ${competitionName} is pending admin approval. You'll be notified once it's reviewed.`,
      {
        type: "registration_created",
        compId,
        registrationId: id,
      }
    );

    const parentIds = await pushService.getActiveParentIdsForStudent(req.userId!);
    if (parentIds.length > 0) {
      await pushService.sendBatchNotifications(
        parentIds,
        "Child Registration Pending",
        `${studentName} submitted a registration for ${competitionName}. Waiting for admin approval.`,
        {
          type: "child_registration_created",
          compId,
          registrationId: id,
          studentId: req.userId,
        }
      );
    }

    res.status(201).json({ message: "Registration created", id, status: initialStatus, registrationNumber });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ message: "Registration already exists" });
      return;
    }
    console.error("Create registration error:", err);
    res.status(500).json({ message: "Failed to create registration" });
  }
});

// ── PUT /api/registrations/:id ────────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE registrations SET status = $1, updated_at = now()
       WHERE id = $2 AND user_id = $3
       RETURNING id`,
      [status, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    res.json({ message: "Registration updated" });
  } catch (err) {
    console.error("Update registration error:", err);
    res.status(500).json({ message: "Failed to update registration" });
  }
});

// ── DELETE /api/registrations/:id ─────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "DELETE FROM registrations WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    res.json({ message: "Registration deleted" });
  } catch (err) {
    console.error("Delete registration error:", err);
    res.status(500).json({ message: "Failed to delete registration" });
  }
});

export default router;
