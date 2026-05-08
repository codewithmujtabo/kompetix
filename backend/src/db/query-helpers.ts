import { pool } from "../config/database";

/**
 * Soft-delete query helpers.
 *
 * Tables in this app have a nullable `deleted_at TIMESTAMPTZ` column added by migration
 * 1747000000000_soft-delete.sql. Any query that returns "live" rows must filter on it.
 *
 * Usage in raw SQL:
 *   SELECT * FROM users WHERE id = $1 AND ${liveFilter("users")}
 * Or with the prebuilt helpers below.
 */

/**
 * Returns a SQL fragment to filter out soft-deleted rows.
 * Pass the table alias if the query uses one.
 *
 *   liveFilter()        -> "deleted_at IS NULL"
 *   liveFilter("users") -> "users.deleted_at IS NULL"
 *   liveFilter("u")     -> "u.deleted_at IS NULL"
 */
export function liveFilter(tableOrAlias?: string): string {
  return tableOrAlias ? `${tableOrAlias}.deleted_at IS NULL` : `deleted_at IS NULL`;
}

/**
 * Soft-delete a row by id. Returns true if a row was updated, false otherwise.
 * Idempotent: re-soft-deleting a row keeps the original deleted_at timestamp.
 */
export async function softDelete(table: string, id: string, idColumn: string = "id"): Promise<boolean> {
  // Whitelist guard: never accept a table name from user input. Only the explicit list below.
  const ALLOWED_TABLES = new Set([
    "users",
    "students",
    "parents",
    "teachers",
    "registrations",
    "payments",
    "documents",
    "historical_participants",
    "notifications",
  ]);
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`softDelete: refusing to operate on non-allowlisted table '${table}'`);
  }
  if (!/^[a-z_][a-z0-9_]*$/i.test(idColumn)) {
    throw new Error(`softDelete: invalid id column '${idColumn}'`);
  }

  const result = await pool.query(
    `UPDATE ${table} SET deleted_at = now() WHERE ${idColumn} = $1 AND deleted_at IS NULL`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Restore a soft-deleted row. Useful for "oops" recovery flows.
 */
export async function restore(table: string, id: string, idColumn: string = "id"): Promise<boolean> {
  const ALLOWED_TABLES = new Set([
    "users",
    "students",
    "parents",
    "teachers",
    "registrations",
    "payments",
    "documents",
    "historical_participants",
    "notifications",
  ]);
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`restore: refusing to operate on non-allowlisted table '${table}'`);
  }
  if (!/^[a-z_][a-z0-9_]*$/i.test(idColumn)) {
    throw new Error(`restore: invalid id column '${idColumn}'`);
  }

  const result = await pool.query(
    `UPDATE ${table} SET deleted_at = NULL WHERE ${idColumn} = $1 AND deleted_at IS NOT NULL`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
