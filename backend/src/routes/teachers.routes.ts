import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// ── POST /api/teachers/link-student ──────────────────────────────────────────
// Teacher adds a student to their roster by email.
router.post("/link-student", async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;
    const { email } = req.body;

    if (!email?.trim()) {
      res.status(400).json({ message: "Student email is required" });
      return;
    }

    const studentResult = await pool.query(
      "SELECT id, full_name FROM users WHERE email = $1 AND role = 'student'",
      [email.trim().toLowerCase()]
    );

    if (studentResult.rows.length === 0) {
      res.status(404).json({ message: "No student account found with that email" });
      return;
    }

    const { id: studentId, full_name } = studentResult.rows[0];

    await pool.query(
      `INSERT INTO teacher_student_links (teacher_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (teacher_id, student_id) DO NOTHING`,
      [teacherId, studentId]
    );

    res.status(201).json({ message: `${full_name} added to your roster`, studentId, fullName: full_name });
  } catch (err) {
    console.error("Link student error:", err);
    res.status(500).json({ message: "Failed to link student" });
  }
});

// ── DELETE /api/teachers/link-student/:studentId ─────────────────────────────
// Teacher removes a student from their roster.
router.delete("/link-student/:studentId", async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;
    const { studentId } = req.params;

    await pool.query(
      "DELETE FROM teacher_student_links WHERE teacher_id = $1 AND student_id = $2",
      [teacherId, studentId]
    );

    res.json({ message: "Student removed from your roster" });
  } catch (err) {
    console.error("Unlink student error:", err);
    res.status(500).json({ message: "Failed to remove student" });
  }
});

// ── GET /api/teachers/my-students ─────────────────────────────────────────────
// Returns only students linked to this teacher.
router.get("/my-students", async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;

    const result = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.photo_url,
         s.nisn,
         s.grade,
         s.school_name,
         COUNT(r.id) AS registration_count
       FROM teacher_student_links tsl
       JOIN users u ON u.id = tsl.student_id
       JOIN students s ON s.id = u.id
       LEFT JOIN registrations r ON r.user_id = u.id
       WHERE tsl.teacher_id = $1
       GROUP BY u.id, u.full_name, u.email, u.photo_url, s.nisn, s.grade, s.school_name
       ORDER BY u.full_name ASC`,
      [teacherId]
    );

    const students = result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      photoUrl: row.photo_url,
      nisn: row.nisn,
      grade: row.grade,
      school: row.school_name,
      registrationCount: parseInt(row.registration_count),
    }));

    res.json({
      students,
      stats: {
        totalStudents: students.length,
        totalRegistrations: students.reduce((s, r) => s + r.registrationCount, 0),
        activeStudents: students.filter((r) => r.registrationCount > 0).length,
      },
    });
  } catch (err) {
    console.error("Get my students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// ── GET /api/teachers/my-competitions ─────────────────────────────────────────
// Returns competitions that have at least one of this teacher's students registered,
// with the list of which students are registered for each.
router.get("/my-competitions", async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;

    const result = await pool.query(
      `SELECT
         c.id AS comp_id,
         c.name AS comp_name,
         c.category,
         c.fee,
         c.reg_close_date,
         c.competition_date,
         r.id AS reg_id,
         r.status AS reg_status,
         r.registration_number,
         u.id AS student_id,
         u.full_name AS student_name,
         s.grade
       FROM teacher_student_links tsl
       JOIN registrations r ON r.user_id = tsl.student_id
       JOIN competitions c ON c.id = r.comp_id
       JOIN users u ON u.id = tsl.student_id
       JOIN students s ON s.id = u.id
       WHERE tsl.teacher_id = $1
       ORDER BY c.name ASC, u.full_name ASC`,
      [teacherId]
    );

    // Group by competition
    const compMap = new Map<string, {
      id: string;
      name: string;
      category: string | null;
      fee: number;
      regCloseDate: string | null;
      competitionDate: string | null;
      students: { id: string; fullName: string; grade: string; status: string; registrationNumber: string | null }[];
    }>();

    for (const row of result.rows) {
      if (!compMap.has(row.comp_id)) {
        compMap.set(row.comp_id, {
          id: row.comp_id,
          name: row.comp_name,
          category: row.category,
          fee: row.fee,
          regCloseDate: row.reg_close_date,
          competitionDate: row.competition_date,
          students: [],
        });
      }
      compMap.get(row.comp_id)!.students.push({
        id: row.student_id,
        fullName: row.student_name,
        grade: row.grade,
        status: row.reg_status,
        registrationNumber: row.registration_number,
      });
    }

    res.json({ competitions: Array.from(compMap.values()) });
  } catch (err) {
    console.error("Get my competitions error:", err);
    res.status(500).json({ message: "Failed to fetch competitions" });
  }
});

// ── GET /api/teachers/dashboard-summary ───────────────────────────────────────
// Summary stats for dashboard — scoped to teacher's linked students only.
router.get("/dashboard-summary", async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;

    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT tsl.student_id) AS total_students,
         COUNT(r.id) AS total_registrations,
         COUNT(DISTINCT CASE WHEN r.status IN ('paid','approved','completed') THEN r.id END) AS confirmed_registrations,
         COUNT(DISTINCT CASE WHEN r.created_at >= NOW() - INTERVAL '30 days' THEN tsl.student_id END) AS active_students
       FROM teacher_student_links tsl
       LEFT JOIN registrations r ON r.user_id = tsl.student_id
       WHERE tsl.teacher_id = $1`,
      [teacherId]
    );

    const row = result.rows[0];

    res.json({
      totalStudents: parseInt(row.total_students),
      totalRegistrations: parseInt(row.total_registrations),
      confirmedRegistrations: parseInt(row.confirmed_registrations),
      activeStudents: parseInt(row.active_students),
    });
  } catch (err) {
    console.error("Get dashboard summary error:", err);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

// ── GET /api/teachers/upcoming-deadlines ─────────────────────────────────────
// Competitions with approaching deadlines that any of this teacher's students
// are registered for (or have not yet registered for but are open).
router.get("/upcoming-deadlines", async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;

    const result = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.reg_close_date,
         COUNT(DISTINCT r.user_id) AS registered_count,
         EXTRACT(DAY FROM (c.reg_close_date - NOW())) AS days_left
       FROM competitions c
       LEFT JOIN registrations r ON r.comp_id = c.id
         AND r.user_id IN (
           SELECT student_id FROM teacher_student_links WHERE teacher_id = $1
         )
       WHERE c.reg_close_date > NOW()
         AND c.reg_close_date <= NOW() + INTERVAL '30 days'
       GROUP BY c.id, c.name, c.reg_close_date
       ORDER BY c.reg_close_date ASC
       LIMIT 5`,
      [teacherId]
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        competition: row.name,
        deadline: new Date(row.reg_close_date).toLocaleDateString("id-ID", {
          day: "numeric", month: "short", year: "numeric",
        }),
        daysLeft: Math.max(0, parseInt(row.days_left)),
        registeredCount: parseInt(row.registered_count),
        status: parseInt(row.days_left) <= 7 ? "urgent" : "upcoming",
      }))
    );
  } catch (err) {
    console.error("Get upcoming deadlines error:", err);
    res.status(500).json({ message: "Failed to fetch deadlines" });
  }
});

// ── Legacy endpoints kept for compatibility (now scoped to teacher's students) ─

router.get("/students", async (req: Request, res: Response) => {
  // Redirect to my-students with search/grade support for backward compat
  try {
    const teacherId = req.userId!;
    const { search = "", grade = "" } = req.query;

    let query = `
      SELECT
        u.id, u.full_name, u.email, u.photo_url,
        s.nisn, s.grade, s.school_name,
        COUNT(r.id) AS registration_count
      FROM teacher_student_links tsl
      JOIN users u ON u.id = tsl.student_id
      JOIN students s ON s.id = u.id
      LEFT JOIN registrations r ON r.user_id = u.id
      WHERE tsl.teacher_id = $1
    `;

    const params: unknown[] = [teacherId];
    let idx = 2;

    if (search) {
      query += ` AND (u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (grade) {
      query += ` AND s.grade = $${idx}`;
      params.push(grade);
      idx++;
    }

    query += ` GROUP BY u.id, u.full_name, u.email, u.photo_url, s.nisn, s.grade, s.school_name
               ORDER BY u.full_name ASC`;

    const result = await pool.query(query, params);
    const students = result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      photoUrl: row.photo_url,
      nisn: row.nisn,
      grade: row.grade,
      school: row.school_name,
      registrationCount: parseInt(row.registration_count),
    }));

    res.json({
      students,
      stats: {
        totalStudents: students.length,
        totalRegistrations: students.reduce((s, r) => s + r.registrationCount, 0),
        activeStudents: students.filter((r) => r.registrationCount > 0).length,
      },
    });
  } catch (err) {
    console.error("Get teacher students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

export default router;
