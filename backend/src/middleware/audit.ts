import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";

interface AuditOptions {
  action: string;                                       // e.g. 'registration.approve'
  resourceType?: string;                                 // e.g. 'registration'
  resourceIdParam?: string;                              // e.g. 'id' → reads from req.params.id
  capturePayload?: boolean;                              // default true
}

const REDACT_KEYS = new Set([
  "password",
  "current_password",
  "new_password",
  "old_password",
  "token",
  "snap_token",
  "client_key",
  "server_key",
  "signature_key",
  "midtrans_signature",
  "code",      // OTP codes
  "pin",       // parent invitation PINs
]);

function redact(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redact(v);
  }
  return out;
}

/**
 * Wrap an admin/organizer/school-admin route to record an audit_log entry on success.
 * Logs only when the response status is 2xx so we don't pollute the table with failed validation.
 *
 * Usage:
 *   router.post('/registrations/:id/approve', adminOnly, audit({ action: 'registration.approve', resourceType: 'registration', resourceIdParam: 'id' }), handler);
 *
 * The wrapper attaches a `res.on('finish')` hook; route handlers don't need to call anything.
 */
export function audit(options: AuditOptions) {
  const { action, resourceType, resourceIdParam, capturePayload = true } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      // Only log successful writes. 4xx/5xx aren't audit-worthy (the action didn't take effect).
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const userId   = (req as any).userId ?? null;
      const userRole = (req as any).userRole ?? null;
      const resourceId = resourceIdParam ? (req.params?.[resourceIdParam] ?? null) : null;
      const ip = req.ip ?? req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ?? null;
      const ua = req.headers["user-agent"] ?? null;

      const payload = capturePayload
        ? {
            params: redact(req.params),
            query:  redact(req.query),
            body:   redact(req.body),
          }
        : null;

      // Fire-and-forget; never block the response on logging.
      pool
        .query(
          `INSERT INTO audit_log (user_id, user_role, action, resource_type, resource_id, ip, user_agent, payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, userRole, action, resourceType ?? null, resourceId, ip, ua, payload]
        )
        .catch((err) => {
          // Audit log must never crash the request — log to stderr and move on.
          console.error("[audit] failed to insert log:", err.message);
        });
    });
    next();
  };
}
