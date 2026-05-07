import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";
import { schoolAdminOnly } from "../middleware/school-admin.middleware";
import { env } from "../config/env";
import PDFDocument from "pdfkit";
import fetch from "node-fetch";

const router = Router();

// ── GET /api/schools/search ───────────────────────────────────────────────
// Search schools using API.co.id
router.get("/search", async (req: Request, res: Response) => {
  try {
    const {
      name,
      provinceCode,
      regencyCode,
      districtCode,
      grade,
      status,
      npsn,
      page = '1'
    } = req.query;

    // Fall back to DB when API key is not configured
    if (!env.API_CO_ID_KEY) {
      const conditions: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (npsn) {
        conditions.push(`npsn = $${idx++}`);
        values.push(npsn as string);
      }
      if (name) {
        conditions.push(`LOWER(name) LIKE $${idx++}`);
        values.push(`%${(name as string).toLowerCase()}%`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT npsn, name, address, city, province FROM schools ${where} ORDER BY name LIMIT 20`,
        values
      );

      res.json({
        data: rows.map((s: any) => ({
          npsn: s.npsn,
          name: s.name,
          address: s.address,
          regencyName: s.city,
          provinceName: s.province,
        })),
        paging: { page: 1, total: rows.length },
      });
      return;
    }

    // Build query params for API.co.id (snake_case)
    const params = new URLSearchParams();
    if (name) params.append('name', name as string);
    if (provinceCode) params.append('province_code', provinceCode as string);
    if (regencyCode) params.append('regency_code', regencyCode as string);
    if (districtCode) params.append('district_code', districtCode as string);
    if (grade) params.append('grade', grade as string);
    if (status) params.append('status', status as string);
    if (npsn) params.append('npsn', npsn as string);
    params.append('page', page as string);

    const apiUrl = `https://use.api.co.id/regional/indonesia/schools?${params.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        'x-api-co-id': env.API_CO_ID_KEY
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        res.status(500).json({
          message: "School search service authentication failed. Please contact support."
        });
        return;
      }

      throw new Error(`API.co.id returned ${response.status}`);
    }

    const data: any = await response.json();

    // Normalize the response to our format (camelCase)
    const normalizedData = {
      data: (data.data || []).map((school: any) => ({
        npsn: school.npsn,
        name: school.name,
        grade: school.grade,
        status: school.status,
        address: school.address,
        provinceCode: school.province_code,
        provinceName: school.province_name,
        regencyCode: school.regency_code,
        regencyName: school.regency_name,
        districtCode: school.district_code,
        districtName: school.district_name,
      })),
      paging: data.paging || { page: 1, total: 0 }
    };

    res.json(normalizedData);
  } catch (err: any) {
    console.error("School search error:", err);
    res.status(500).json({
      message: "Failed to search schools",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

// ── POST /api/schools ─────────────────────────────────────────────────────
// Create a new school (admin endpoint - would typically be restricted)
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { npsn, name, address, city, province } = req.body;

    if (!npsn || !name) {
      res.status(400).json({ message: "NPSN and name are required" });
      return;
    }

    // Check if NPSN already exists
    const existing = await pool.query("SELECT id FROM schools WHERE npsn = $1", [npsn]);
    if (existing.rows.length > 0) {
      res.status(409).json({ message: "School with this NPSN already exists" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO schools (npsn, name, address, city, province)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [npsn, name, address || null, city || null, province || null]
    );

    res.status(201).json({
      schoolId: result.rows[0].id,
      npsn: result.rows[0].npsn,
      name: result.rows[0].name,
      address: result.rows[0].address,
      city: result.rows[0].city,
      province: result.rows[0].province,
      createdAt: result.rows[0].created_at
    });
  } catch (err) {
    console.error("Create school error:", err);
    res.status(500).json({ message: "Failed to create school" });
  }
});

// ── GET /api/schools/my-school ────────────────────────────────────────────
// Get school details for the current school admin
router.get("/my-school", authMiddleware, schoolAdminOnly, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user's school_id
    const userResult = await pool.query(
      "SELECT school_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].school_id) {
      res.status(404).json({ message: "No school associated with this account" });
      return;
    }

    const schoolId = userResult.rows[0].school_id;

    // Get school details
    const schoolResult = await pool.query(
      "SELECT * FROM schools WHERE id = $1",
      [schoolId]
    );

    if (schoolResult.rows.length === 0) {
      res.status(404).json({ message: "School not found" });
      return;
    }

    // Get student count
    const studentCount = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE school_id = $1 AND role = 'student'",
      [schoolId]
    );

    const school = schoolResult.rows[0];

    res.json({
      id: school.id,
      npsn: school.npsn,
      name: school.name,
      address: school.address,
      city: school.city,
      province: school.province,
      studentCount: parseInt(studentCount.rows[0].count),
      createdAt: school.created_at
    });
  } catch (err) {
    console.error("Get my school error:", err);
    res.status(500).json({ message: "Failed to fetch school details" });
  }
});

// ── GET /api/schools/students ─────────────────────────────────────────────
// List students for the current school
router.get("/students", authMiddleware, schoolAdminOnly, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { grade, search, page = '1', limit = '50' } = req.query;

    // Get user's school_id
    const userResult = await pool.query(
      "SELECT school_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].school_id) {
      res.status(403).json({ message: "No school associated with this account" });
      return;
    }

    const schoolId = userResult.rows[0].school_id;

    // Build query
    let query = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.created_at,
        s.grade,
        s.nisn,
        COUNT(DISTINCT r.id) as registration_count
      FROM users u
      LEFT JOIN students s ON u.id = s.id
      LEFT JOIN registrations r ON u.id = r.user_id
      WHERE u.school_id = $1 AND u.role = 'student'
    `;

    const params: any[] = [schoolId];
    let paramIndex = 2;

    if (grade) {
      query += ` AND s.grade = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY u.id, s.grade, s.nisn ORDER BY u.created_at DESC`;

    // Add pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN students s ON u.id = s.id
      WHERE u.school_id = $1 AND u.role = 'student'
    `;
    const countParams: any[] = [schoolId];
    let countParamIndex = 2;

    if (grade) {
      countQuery += ` AND s.grade = $${countParamIndex}`;
      countParams.push(grade);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (u.full_name ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      students: result.rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        grade: row.grade,
        nisn: row.nisn,
        registrationCount: parseInt(row.registration_count),
        createdAt: row.created_at
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error("Get students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// ── GET /api/schools/registrations ────────────────────────────────────────
// List registrations for the current school
router.get("/registrations", authMiddleware, schoolAdminOnly, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { compId, status, page = '1', limit = '50' } = req.query;

    // Get user's school_id
    const userResult = await pool.query(
      "SELECT school_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].school_id) {
      res.status(403).json({ message: "No school associated with this account" });
      return;
    }

    const schoolId = userResult.rows[0].school_id;

    // Build query
    let query = `
      SELECT
        r.id as registration_id,
        r.status,
        r.created_at as registered_at,
        u.id as student_id,
        u.full_name as student_name,
        u.email as student_email,
        s.grade,
        c.id as competition_id,
        c.name as competition_name,
        c.category,
        c.fee as competition_fee,
        c.grade_level as level,
        c.competition_date as start_date,
        c.reg_close_date
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN students s ON u.id = s.id
      JOIN competitions c ON r.comp_id = c.id
      WHERE u.school_id = $1
    `;

    const params: any[] = [schoolId];
    let paramIndex = 2;

    if (compId) {
      query += ` AND c.id = $${paramIndex}`;
      params.push(compId);
      paramIndex++;
    }

    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY r.created_at DESC`;

    // Add pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN competitions c ON r.comp_id = c.id
      WHERE u.school_id = $1
    `;
    const countParams: any[] = [schoolId];
    let countParamIndex = 2;

    if (compId) {
      countQuery += ` AND c.id = $${countParamIndex}`;
      countParams.push(compId);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND r.status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      registrations: result.rows.map(row => ({
        registrationId: row.registration_id,
        status: row.status,
        registeredAt: row.registered_at,
        student: {
          id: row.student_id,
          name: row.student_name,
          email: row.student_email,
          grade: row.grade
        },
        competition: {
          id: row.competition_id,
          name: row.competition_name,
          category: row.category,
          fee: Number(row.competition_fee ?? 0),
          level: row.level,
          startDate: row.start_date,
          regCloseDate: row.reg_close_date
        }
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error("Get registrations error:", err);
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
});

// ── GET /api/schools/export/csv ───────────────────────────────────────────
// Export student data as CSV
router.get("/export/csv", authMiddleware, schoolAdminOnly, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user's school_id
    const userResult = await pool.query(
      "SELECT school_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].school_id) {
      res.status(403).json({ message: "No school associated with this account" });
      return;
    }

    const schoolId = userResult.rows[0].school_id;

    // Get all students
    const result = await pool.query(
      `SELECT
        u.full_name,
        u.email,
        u.phone,
        s.grade,
        s.nisn,
        u.created_at,
        COUNT(DISTINCT r.id) as registration_count
      FROM users u
      LEFT JOIN students s ON u.id = s.id
      LEFT JOIN registrations r ON u.id = r.user_id
      WHERE u.school_id = $1 AND u.role = 'student'
      GROUP BY u.id, s.grade, s.nisn
      ORDER BY u.full_name ASC
      LIMIT 500`,
      [schoolId]
    );

    // Generate CSV
    const csvRows = [];
    csvRows.push('Full Name,Email,Phone,Grade,NISN,Registration Count,Created At');

    for (const row of result.rows) {
      csvRows.push([
        row.full_name || '',
        row.email || '',
        row.phone || '',
        row.grade || '',
        row.nisn || '',
        row.registration_count || '0',
        new Date(row.created_at).toISOString().split('T')[0]
      ].join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="students-export-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("Export CSV error:", err);
    res.status(500).json({ message: "Failed to export CSV" });
  }
});

// ── GET /api/schools/export/registrations/pdf ─────────────────────────────
// Export registration report as PDF
router.get("/export/registrations/pdf", authMiddleware, schoolAdminOnly, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user's school_id and school name
    const userResult = await pool.query(
      `SELECT u.school_id, s.name as school_name
       FROM users u
       JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].school_id) {
      res.status(403).json({ message: "No school associated with this account" });
      return;
    }

    const schoolId = userResult.rows[0].school_id;
    const schoolName = userResult.rows[0].school_name;

    // Get registration summary
    const summaryResult = await pool.query(
      `SELECT
        c.name as competition_name,
        c.category,
        c.grade_level as level,
        COUNT(*) as registration_count,
        COUNT(*) FILTER (WHERE r.status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE r.status = 'registered') as registered_count
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN competitions c ON r.comp_id = c.id
      WHERE u.school_id = $1
      GROUP BY c.id, c.name, c.category, c.grade_level
      ORDER BY registration_count DESC
      LIMIT 50`,
      [schoolId]
    );

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="registrations-report-${Date.now()}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Registration Report', { align: 'center' });
    doc.moveDown();

    // Add school info
    doc.fontSize(14).text(`School: ${schoolName}`);
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Add summary table
    doc.fontSize(14).text('Competition Summary', { underline: true });
    doc.moveDown(0.5);

    if (summaryResult.rows.length === 0) {
      doc.fontSize(12).text('No registrations found.');
    } else {
      // Table header
      doc.fontSize(10);
      const y = doc.y;
      doc.text('Competition', 50, y, { width: 200 });
      doc.text('Category', 260, y, { width: 100 });
      doc.text('Total', 370, y, { width: 50 });
      doc.text('Paid', 430, y, { width: 50 });
      doc.text('Reg.', 490, y, { width: 50 });

      doc.moveDown();

      // Table rows
      for (const row of summaryResult.rows) {
        const rowY = doc.y;
        doc.text(row.competition_name, 50, rowY, { width: 200 });
        doc.text(`${row.category} - ${row.level}`, 260, rowY, { width: 100 });
        doc.text(row.registration_count.toString(), 370, rowY, { width: 50 });
        doc.text(row.paid_count.toString(), 430, rowY, { width: 50 });
        doc.text(row.registered_count.toString(), 490, rowY, { width: 50 });
        doc.moveDown(0.8);
      }
    }

    // Finalize PDF
    doc.end();
  } catch (err) {
    console.error("Export PDF error:", err);
    res.status(500).json({ message: "Failed to export PDF" });
  }
});

export default router;
