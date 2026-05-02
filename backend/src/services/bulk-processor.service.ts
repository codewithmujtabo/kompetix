import { pool } from "../config/database";
import { parse } from "csv-parse/sync";
import { hashPassword } from "./auth.service";
import crypto from "crypto";

interface CsvRow {
  full_name: string;
  email: string;
  phone: string;
  nisn: string;
  grade: string;
  competition_id: string;
}

interface ProcessingError {
  row: number;
  error: string;
}

/**
 * Background processor for bulk registration jobs
 * Called by cron service every minute
 */
export async function processPendingJobs(): Promise<void> {
  const client = await pool.connect();
  try {
    // Find next pending job
    const jobResult = await client.query(
      `SELECT * FROM bulk_registration_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (jobResult.rows.length === 0) {
      return; // No pending jobs
    }

    const job = jobResult.rows[0];

    // Mark as processing
    await client.query(
      "UPDATE bulk_registration_jobs SET status = 'processing' WHERE id = $1",
      [job.id]
    );

    console.log(`Processing bulk job ${job.id}: ${job.file_name}`);

    await processJob(job.id, job.csv_data);
  } catch (err) {
    console.error("Error in bulk job processor:", err);
  } finally {
    client.release();
  }
}

/**
 * Process a single bulk registration job
 */
async function processJob(jobId: string, csvData: CsvRow[]): Promise<void> {
  const errors: ProcessingError[] = [];
  let successful = 0;

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 2; // +2 for header row and 1-based indexing

    try {
      await processRow(row);
      successful++;

      // Update progress every 10 rows
      if (i % 10 === 0 || i === csvData.length - 1) {
        await pool.query(
          `UPDATE bulk_registration_jobs
           SET processed_rows = $1, successful_rows = $2
           WHERE id = $3`,
          [i + 1, successful, jobId]
        );
      }
    } catch (err: any) {
      errors.push({
        row: rowNumber,
        error: err.message || "Unknown error"
      });
    }
  }

  // Mark job as completed
  await pool.query(
    `UPDATE bulk_registration_jobs
     SET status = 'completed',
         processed_rows = $1,
         successful_rows = $2,
         failed_rows = $3,
         errors = $4,
         completed_at = now()
     WHERE id = $5`,
    [csvData.length, successful, errors.length, JSON.stringify(errors), jobId]
  );

  console.log(`Job ${jobId} completed: ${successful} successful, ${errors.length} failed`);
}

/**
 * Process a single CSV row
 */
async function processRow(row: CsvRow): Promise<void> {
  // Validate required fields
  if (!row.full_name || !row.email || !row.competition_id) {
    throw new Error("Missing required fields: full_name, email, competition_id");
  }

  // Validate NISN format (10 digits)
  if (row.nisn && !/^\d{10}$/.test(row.nisn)) {
    throw new Error("Invalid NISN format (must be 10 digits)");
  }

  // Validate email format
  if (!row.email.includes("@")) {
    throw new Error("Invalid email format");
  }

  // Validate grade (should be a number between 1-12)
  const grade = parseInt(row.grade);
  if (row.grade && (isNaN(grade) || grade < 1 || grade > 12)) {
    throw new Error("Invalid grade (must be 1-12)");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if student exists by email or NISN
    let userId: string | null = null;

    if (row.nisn) {
      const nisnCheck = await client.query(
        "SELECT id FROM students WHERE nisn = $1",
        [row.nisn]
      );
      if (nisnCheck.rows.length > 0) {
        userId = nisnCheck.rows[0].id;
      }
    }

    if (!userId) {
      const emailCheck = await client.query(
        "SELECT id FROM users WHERE email = $1 AND role = 'student'",
        [row.email.toLowerCase()]
      );
      if (emailCheck.rows.length > 0) {
        userId = emailCheck.rows[0].id;
      }
    }

    // Create student if doesn't exist
    if (!userId) {
      const tempPassword = crypto.randomBytes(16).toString("hex");
      const defaultPassword = await hashPassword(tempPassword);

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role, consent_accepted_at, consent_version)
         VALUES ($1, $2, $3, $4, 'student', now(), '1.0')
         RETURNING id`,
        [row.email.toLowerCase(), defaultPassword, row.full_name, row.phone || null]
      );
      userId = userResult.rows[0].id;

      // Create student record
      await client.query(
        `INSERT INTO students (id, grade, nisn)
         VALUES ($1, $2, $3)`,
        [userId, grade || null, row.nisn || null]
      );
    }

    // Check if competition exists
    const compCheck = await client.query(
      "SELECT id, reg_close_date FROM competitions WHERE id = $1",
      [row.competition_id]
    );

    if (compCheck.rows.length === 0) {
      throw new Error("Competition not found");
    }

    const competition = compCheck.rows[0];

    // Check if registration is still open
    if (competition.reg_close_date && new Date(competition.reg_close_date) < new Date()) {
      throw new Error("Competition registration is closed");
    }

    // Check if student is already registered
    const existingReg = await client.query(
      "SELECT id FROM registrations WHERE user_id = $1 AND comp_id = $2",
      [userId, row.competition_id]
    );

    if (existingReg.rows.length > 0) {
      throw new Error("Student already registered for this competition");
    }

    // Create registration
    await client.query(
      `INSERT INTO registrations (user_id, comp_id, status, registered_at)
       VALUES ($1, $2, 'registered', now())`,
      [userId, row.competition_id]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Parse and validate CSV file contents
 */
export function parseAndValidateCsv(fileContent: string): { rows: CsvRow[], totalRows: number } {
  try {
    const rows = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CsvRow[];

    // Validate required columns
    if (rows.length === 0) {
      throw new Error("CSV file is empty");
    }

    const requiredColumns = ['full_name', 'email', 'competition_id'];
    const firstRow = rows[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    return { rows, totalRows: rows.length };
  } catch (err: any) {
    throw new Error(`CSV parsing error: ${err.message}`);
  }
}
