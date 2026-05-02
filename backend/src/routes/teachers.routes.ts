import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// ── GET /api/teachers/students ───────────────────────────────────────────
// Returns list of students with search and grade filter
router.get("/students", async (req: Request, res: Response) => {
  try {
    const { search = "", grade = "" } = req.query;

    let query = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.photo_url,
        s.nisn,
        s.grade,
        s.school_name,
        COUNT(r.id) as registration_count
      FROM users u
      JOIN students s ON u.id = s.id
      LEFT JOIN registrations r ON u.id = r.user_id
      WHERE u.role = 'student'
    `;

    const params: any[] = [];
    let paramCount = 1;

    // Add search filter
    if (search) {
      query += ` AND (u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Add grade filter
    if (grade) {
      query += ` AND s.grade = $${paramCount}`;
      params.push(grade);
      paramCount++;
    }

    query += ` GROUP BY u.id, u.full_name, u.email, u.photo_url, s.nisn, s.grade, s.school_name
               ORDER BY u.full_name ASC`;

    const result = await pool.query(query, params);

    // Calculate summary stats
    const totalStudents = result.rows.length;
    const totalRegistrations = result.rows.reduce((sum, row) => sum + parseInt(row.registration_count), 0);
    const activeStudents = result.rows.filter(row => parseInt(row.registration_count) > 0).length;

    res.json({
      students: result.rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        photoUrl: row.photo_url,
        nisn: row.nisn,
        grade: row.grade,
        school: row.school_name,
        registrationCount: parseInt(row.registration_count),
      })),
      stats: {
        totalStudents,
        totalRegistrations,
        activeStudents,
      },
    });
  } catch (err) {
    console.error("Get teacher students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// ── GET /api/teachers/analytics/registrations-by-month ───────────────────
// Returns registration counts grouped by month
router.get("/analytics/registrations-by-month", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        TO_CHAR(r.created_at, 'Mon') as month,
        COUNT(*) as count
      FROM registrations r
      WHERE r.created_at >= NOW() - INTERVAL '4 months'
      GROUP BY TO_CHAR(r.created_at, 'Mon'), EXTRACT(MONTH FROM r.created_at)
      ORDER BY EXTRACT(MONTH FROM r.created_at) ASC
    `;

    const result = await pool.query(query);

    res.json(
      result.rows.map((row) => ({
        month: row.month,
        count: parseInt(row.count),
      }))
    );
  } catch (err) {
    console.error("Get registrations by month error:", err);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// ── GET /api/teachers/analytics/categories ───────────────────────────────
// Returns registration counts grouped by competition category
router.get("/analytics/categories", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        c.category,
        COUNT(r.id) as count
      FROM registrations r
      JOIN competitions c ON r.comp_id = c.id
      WHERE c.category IS NOT NULL
      GROUP BY c.category
      ORDER BY count DESC
    `;

    const result = await pool.query(query);

    // Color mapping for categories
    const colorMap: Record<string, string> = {
      Academic: "#4F46E5",
      Arts: "#10B981",
      Sports: "#F59E0B",
      Debate: "#EF4444",
      Science: "#8B5CF6",
      Technology: "#06B6D4",
    };

    res.json(
      result.rows.map((row) => ({
        category: row.category,
        count: parseInt(row.count),
        color: colorMap[row.category] || "#64748B",
      }))
    );
  } catch (err) {
    console.error("Get categories analytics error:", err);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// ── GET /api/teachers/analytics/grade-participation ──────────────────────
// Returns registration counts grouped by grade
router.get("/analytics/grade-participation", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        s.grade,
        COUNT(r.id) as count
      FROM registrations r
      JOIN students s ON r.user_id = s.id
      WHERE s.grade IS NOT NULL
      GROUP BY s.grade
      ORDER BY s.grade ASC
    `;

    const result = await pool.query(query);

    res.json(
      result.rows.map((row) => ({
        grade: `Grade ${row.grade}`,
        count: parseInt(row.count),
      }))
    );
  } catch (err) {
    console.error("Get grade participation error:", err);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// ── GET /api/teachers/analytics/success-rate ─────────────────────────────
// Returns registration status distribution
router.get("/analytics/success-rate", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        status,
        COUNT(*) as count
      FROM registrations
      GROUP BY status
    `;

    const result = await pool.query(query);

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

    // Map statuses to success categories
    const confirmed = result.rows
      .filter((r) => ["paid", "completed"].includes(r.status))
      .reduce((sum, row) => sum + parseInt(row.count), 0);

    const pending = result.rows
      .filter((r) => ["registered", "pending_payment"].includes(r.status))
      .reduce((sum, row) => sum + parseInt(row.count), 0);

    const rejected = result.rows
      .filter((r) => ["rejected", "cancelled"].includes(r.status))
      .reduce((sum, row) => sum + parseInt(row.count), 0);

    res.json({
      confirmed: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      pending: total > 0 ? Math.round((pending / total) * 100) : 0,
      rejected: total > 0 ? Math.round((rejected / total) * 100) : 0,
    });
  } catch (err) {
    console.error("Get success rate error:", err);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// ── GET /api/teachers/recent-activities ──────────────────────────────────
// Returns recent teacher actions and events
router.get("/recent-activities", async (req: Request, res: Response) => {
  try {
    // Get recent bulk registration jobs
    const bulkJobsQuery = `
      SELECT
        id,
        file_name,
        successful_rows,
        created_at,
        'bulk_registration' as activity_type
      FROM bulk_registration_jobs
      WHERE uploaded_by = $1
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const bulkJobs = await pool.query(bulkJobsQuery, [req.userId]);

    // Get recent registrations (as a proxy for teacher activity)
    const registrationsQuery = `
      SELECT
        r.created_at,
        c.name as competition_name,
        COUNT(*) as student_count
      FROM registrations r
      JOIN competitions c ON r.comp_id = c.id
      WHERE r.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY r.created_at, c.name
      ORDER BY r.created_at DESC
      LIMIT 5
    `;

    const recentRegs = await pool.query(registrationsQuery);

    // Combine and format activities
    const activities = [
      ...bulkJobs.rows.map((job) => ({
        id: job.id,
        action: `Bulk registered ${job.successful_rows} students`,
        competition: job.file_name.replace('.csv', ''),
        time: getTimeAgo(job.created_at),
        icon: "checkmark.circle.fill",
        color: "#10B981",
      })),
      ...recentRegs.rows.slice(0, 3 - bulkJobs.rows.length).map((reg, idx) => ({
        id: `reg-${idx}`,
        action: `${reg.student_count} new registrations`,
        competition: reg.competition_name,
        time: getTimeAgo(reg.created_at),
        icon: "person.3.fill",
        color: "#4F46E5",
      })),
    ];

    res.json(activities);
  } catch (err) {
    console.error("Get recent activities error:", err);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

// ── GET /api/teachers/upcoming-deadlines ─────────────────────────────────
// Returns competitions with approaching registration deadlines
router.get("/upcoming-deadlines", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        c.id,
        c.name,
        c.reg_close_date,
        COUNT(r.id) as registered_count,
        EXTRACT(DAY FROM (c.reg_close_date - NOW())) as days_left
      FROM competitions c
      LEFT JOIN registrations r ON c.id = r.comp_id
      WHERE c.reg_close_date > NOW()
        AND c.reg_close_date <= NOW() + INTERVAL '30 days'
      GROUP BY c.id, c.name, c.reg_close_date
      ORDER BY c.reg_close_date ASC
      LIMIT 5
    `;

    const result = await pool.query(query);

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        competition: row.name,
        deadline: new Date(row.reg_close_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
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

// ── GET /api/teachers/key-metrics ────────────────────────────────────────
// Returns summary metrics for analytics cards
router.get("/key-metrics", async (req: Request, res: Response) => {
  try {
    // Total registrations in current month
    const currentMonthQuery = `
      SELECT COUNT(*) as current_count
      FROM registrations
      WHERE created_at >= DATE_TRUNC('month', NOW())
    `;
    const currentMonth = await pool.query(currentMonthQuery);

    // Previous month for comparison
    const previousMonthQuery = `
      SELECT COUNT(*) as previous_count
      FROM registrations
      WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND created_at < DATE_TRUNC('month', NOW())
    `;
    const previousMonth = await pool.query(previousMonthQuery);

    const currentCount = parseInt(currentMonth.rows[0].current_count);
    const previousCount = parseInt(previousMonth.rows[0].previous_count);
    const percentChange = previousCount > 0
      ? Math.round(((currentCount - previousCount) / previousCount) * 100)
      : 0;

    // Active students
    const activeStudentsQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM registrations
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    const activeStudents = await pool.query(activeStudentsQuery);

    // Average per student
    const avgQuery = `
      SELECT
        COUNT(r.id)::float / NULLIF(COUNT(DISTINCT r.user_id), 0) as avg_per_student
      FROM registrations r
      WHERE r.created_at >= NOW() - INTERVAL '30 days'
    `;
    const avgResult = await pool.query(avgQuery);

    res.json({
      totalRegistrations: currentCount,
      percentChange: percentChange,
      activeStudents: parseInt(activeStudents.rows[0].count),
      averagePerStudent: parseFloat(avgResult.rows[0].avg_per_student || 0).toFixed(1),
    });
  } catch (err) {
    console.error("Get key metrics error:", err);
    res.status(500).json({ message: "Failed to fetch metrics" });
  }
});

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export default router;
