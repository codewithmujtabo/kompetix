import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";
import multer from "multer";
import { parseAndValidateCsv } from "../services/bulk-processor.service";

const router = Router();

// Configure multer for file upload (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Authorization middleware for teachers and school admins
function teacherOrAdminOnly(req: Request, res: Response, next: Function) {
  if (!req.userRole || !['teacher', 'school_admin'].includes(req.userRole)) {
    res.status(403).json({ message: "Only teachers and school admins can upload bulk registrations" });
    return;
  }
  next();
}

// ── POST /api/bulk-registration/upload ───────────────────────────────────
// Upload CSV file for bulk registration
router.post("/upload", authMiddleware, teacherOrAdminOnly, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const uploaderId = req.userId!;

    if (!req.file) {
      res.status(400).json({ message: "CSV file is required" });
      return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const fileName = req.file.originalname;

    // Parse and validate CSV
    let csvData;
    let totalRows;
    try {
      const parsed = parseAndValidateCsv(fileContent);
      csvData = parsed.rows;
      totalRows = parsed.totalRows;
    } catch (err: any) {
      res.status(400).json({ message: err.message });
      return;
    }

    // Create job record
    const result = await pool.query(
      `INSERT INTO bulk_registration_jobs (uploaded_by, file_name, total_rows, csv_data)
       VALUES ($1, $2, $3, $4)
       RETURNING id, status, total_rows, created_at`,
      [uploaderId, fileName, totalRows, JSON.stringify(csvData)]
    );

    const job = result.rows[0];

    res.status(201).json({
      jobId: job.id,
      fileName: fileName,
      totalRows: job.total_rows,
      status: job.status,
      createdAt: job.created_at,
      message: "CSV uploaded successfully. Processing will begin shortly."
    });
  } catch (err: any) {
    console.error("Bulk upload error:", err);
    res.status(500).json({ message: err.message || "Failed to upload CSV" });
  }
});

// ── GET /api/bulk-registration/jobs/:jobId ───────────────────────────────
// Get job status and progress
router.get("/jobs/:jobId", authMiddleware, teacherOrAdminOnly, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const uploaderId = req.userId!;

    const result = await pool.query(
      `SELECT
        id,
        file_name,
        total_rows,
        processed_rows,
        successful_rows,
        failed_rows,
        status,
        errors,
        created_at,
        completed_at
       FROM bulk_registration_jobs
       WHERE id = $1 AND uploaded_by = $2`,
      [jobId, uploaderId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    const job = result.rows[0];

    res.json({
      id: job.id,
      fileName: job.file_name,
      status: job.status,
      totalRows: job.total_rows,
      processedRows: job.processed_rows || 0,
      successfulRows: job.successful_rows || 0,
      failedRows: job.failed_rows || 0,
      errors: job.errors || [],
      createdAt: job.created_at,
      completedAt: job.completed_at,
      progress: job.total_rows > 0 ? Math.round((job.processed_rows || 0) / job.total_rows * 100) : 0
    });
  } catch (err) {
    console.error("Get job error:", err);
    res.status(500).json({ message: "Failed to fetch job status" });
  }
});

// ── GET /api/bulk-registration/jobs ──────────────────────────────────────
// List all jobs for the current user
router.get("/jobs", authMiddleware, teacherOrAdminOnly, async (req: Request, res: Response) => {
  try {
    const uploaderId = req.userId!;

    const result = await pool.query(
      `SELECT
        id,
        file_name,
        total_rows,
        processed_rows,
        successful_rows,
        failed_rows,
        status,
        created_at,
        completed_at
       FROM bulk_registration_jobs
       WHERE uploaded_by = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [uploaderId]
    );

    res.json(result.rows.map(job => ({
      id: job.id,
      fileName: job.file_name,
      status: job.status,
      totalRows: job.total_rows,
      processedRows: job.processed_rows || 0,
      successfulRows: job.successful_rows || 0,
      failedRows: job.failed_rows || 0,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      progress: job.total_rows > 0 ? Math.round((job.processed_rows || 0) / job.total_rows * 100) : 0
    })));
  } catch (err) {
    console.error("List jobs error:", err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

export default router;
