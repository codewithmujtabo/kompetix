/**
 * One-time import script for historical Eduversal competition data.
 *
 * Usage:
 *   npm run db:import-historical -- /path/to/Eduversal_Database.xlsx
 *   npx ts-node src/db/import-historical.ts /path/to/Eduversal_Database.xlsx
 *
 * Safe to re-run — uses ON CONFLICT (source_id) DO NOTHING for idempotency.
 * Requires: npm install (xlsx added to devDependencies)
 */

import * as XLSX from "xlsx";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { pool } from "../config/database";

// ── Phone normalisation ────────────────────────────────────────────────────
function normalizePhone(raw: unknown): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 8) return null; // too short to be valid
  if (digits.startsWith("62") && digits.length >= 10) return "+" + digits;
  if (digits.startsWith("8") && digits.length >= 9) return "+62" + digits;
  if (digits.startsWith("08") && digits.length >= 10) return "+62" + digits.slice(1);
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: ts-node import-historical.ts <path/to/Eduversal_Database.xlsx>");
    process.exit(1);
  }

  console.log(`Reading ${filePath} …`);
  const wb = XLSX.readFile(filePath);

  // ── Build lookup maps ────────────────────────────────────────────────────
  type CompRow = { comp_id: string; year: string; comp_name: string; event_part: string; comp_categories: string };
  const competitionsSheet = XLSX.utils.sheet_to_json<CompRow>(wb.Sheets["Competitions"]);
  const competitionMap = new Map<string, CompRow>();
  for (const row of competitionsSheet) {
    if (row.comp_id) competitionMap.set(String(row.comp_id), row);
  }
  console.log(`Loaded ${competitionMap.size} competitions`);

  type SchoolRow = { school_id: string; school_name: string; npsn: string; province: string };
  const schoolsSheet = XLSX.utils.sheet_to_json<SchoolRow>(wb.Sheets["Schools"]);
  const schoolMap = new Map<string, SchoolRow>();
  for (const row of schoolsSheet) {
    if (row.school_id) schoolMap.set(String(row.school_id), row);
  }
  console.log(`Loaded ${schoolMap.size} schools`);

  // ── Process Students sheet ───────────────────────────────────────────────
  type StudentRow = {
    student_id: string;
    name: string;
    email: string;
    grade: string;
    gender: string;
    status: string;
    participant_type: string;
    finalist: string;
    winner: string;
    school_id: string;
    comp_id: string;
    whatsapp: unknown;
    payment_method: string;
  };

  const studentsSheet = XLSX.utils.sheet_to_json<StudentRow>(wb.Sheets["Students"]);
  console.log(`Processing ${studentsSheet.length} student rows …`);

  // ── Deduplication: track source_ids already seen in this run ────────────
  const seenSourceIds = new Set<string>();
  const rows: unknown[][] = [];

  for (const s of studentsSheet) {
    if (!s.student_id || !s.name) continue;
    const sourceId = String(s.student_id).trim();
    if (seenSourceIds.has(sourceId)) continue;
    seenSourceIds.add(sourceId);

    const comp = s.comp_id ? competitionMap.get(String(s.comp_id)) : undefined;
    const school = s.school_id ? schoolMap.get(String(s.school_id)) : undefined;

    const email = s.email ? String(s.email).toLowerCase().trim() : null;
    const phone = normalizePhone(s.whatsapp);
    const result = s.finalist === "PASSED" ? "PASSED" : s.finalist === "FAILED" ? "FAILED" : null;

    rows.push([
      sourceId,
      String(s.name).trim(),
      email,
      phone,
      s.grade ? String(s.grade).trim() : null,
      s.gender ? String(s.gender).trim() : null,
      s.status ? String(s.status).trim() : null,
      result,
      school?.school_name ?? null,
      school?.npsn ?? null,
      s.comp_id ? String(s.comp_id).trim() : null,
      comp?.comp_name ?? null,
      comp?.year ? String(comp.year).trim() : null,
      comp?.comp_categories ?? null,
      comp?.event_part ?? null,
    ]);
  }

  console.log(`Inserting ${rows.length} unique records in batches …`);

  const BATCH = 500;
  let inserted = 0;
  let skipped = 0;

  const client = await pool.connect();
  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);

      // Build parameterised VALUES list
      const placeholders = batch
        .map((_, bIdx) => {
          const base = bIdx * 15;
          return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15})`;
        })
        .join(",");

      const values = batch.flat();

      const result = await client.query(
        `INSERT INTO historical_participants
           (source_id, full_name, email, phone, grade, gender,
            payment_status, result, school_name, school_npsn,
            comp_id, comp_name, comp_year, comp_category, event_part)
         VALUES ${placeholders}
         ON CONFLICT (source_id) DO NOTHING`,
        values
      );

      inserted += result.rowCount ?? 0;
      skipped += batch.length - (result.rowCount ?? 0);

      if ((i / BATCH + 1) % 10 === 0 || i + BATCH >= rows.length) {
        console.log(`  … ${Math.min(i + BATCH, rows.length)} / ${rows.length} processed`);
      }
    }
  } finally {
    client.release();
  }

  console.log(`\nDone. Inserted: ${inserted}  Skipped (already exists): ${skipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
