import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { env } from "../config/env";
import { authMiddleware } from "../middleware/auth";
import { schoolAdminOnly } from "../middleware/school-admin.middleware";
import { createSnapToken, getTransactionStatus } from "../services/midtrans.service";
import * as pushService from "../services/push.service";

const router = Router();

// ── T20: Parent ownership check ───────────────────────────────────────────────
// Returns true if userId owns the registration directly OR is a linked parent.
async function canAccessRegistration(userId: string, registrationId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM registrations r
     WHERE r.id = $1
       AND (
         r.user_id = $2
         OR EXISTS (
           SELECT 1 FROM parent_student_links psl
           WHERE psl.parent_id = $2
             AND psl.student_id = r.user_id
             AND psl.status = 'active'
         )
       )
     LIMIT 1`,
    [registrationId, userId]
  );
  return result.rows.length > 0;
}

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// Midtrans calls this directly — no auth middleware.
// https://docs.midtrans.com/reference/handling-notifications
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const {
      order_id,
      status_code,
      gross_amount,
      transaction_id,
      transaction_status,
      payment_type,
      fraud_status,
      signature_key,
    } = req.body;

    // ── Signature verification ─────────────────────────────────────────────
    const expectedSig = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${env.MIDTRANS_SERVER_KEY}`)
      .digest("hex");

    if (expectedSig !== signature_key) {
      console.warn("Midtrans webhook: invalid signature for order", order_id);
      res.status(403).json({ message: "Invalid signature" });
      return;
    }

    // ── Look up the payment record ─────────────────────────────────────────
    const paymentResult = await pool.query(
      `SELECT id, registration_id FROM payments WHERE order_id = $1 LIMIT 1`,
      [order_id]
    );

    if (paymentResult.rows.length === 0) {
      // Might arrive before the INSERT completes on slow networks — log and 200
      console.warn("Midtrans webhook: no payment found for order_id", order_id);
      res.json({ message: "OK" });
      return;
    }

    const { id: paymentDbId, registration_id } = paymentResult.rows[0];

    // ── Determine new statuses ─────────────────────────────────────────────
    // settlement = non-card success; capture + accept = card success
    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    let newPaymentStatus: string;

    if (isSuccess) {
      newPaymentStatus = "settlement";
    } else if (transaction_status === "pending") {
      newPaymentStatus = "pending";
    } else if (["deny", "cancel", "expire", "failure"].includes(transaction_status)) {
      newPaymentStatus = transaction_status;
    } else {
      newPaymentStatus = transaction_status ?? "unknown";
    }

    // ── Update payments row ────────────────────────────────────────────────
    await pool.query(
      `UPDATE payments
         SET payment_status = $1,
             payment_id     = $2,
             payment_method = $3,
             updated_at     = now()
       WHERE id = $4`,
      [newPaymentStatus, transaction_id ?? null, payment_type ?? null, paymentDbId]
    );

    // T10: VA/payment expired — reset registration so student can initiate a new payment
    if (transaction_status === "expire") {
      await pool.query(
        `UPDATE registrations SET status = 'registered', updated_at = now() WHERE id = $1`,
        [registration_id]
      );
      console.log(`Payment expired: order=${order_id} — registration ${registration_id} reset to 'registered'`);
    }

    // ── Mark registration as paid and notify student ───────────────────────
    if (isSuccess) {
      await pool.query(
        `UPDATE registrations SET status = 'paid', updated_at = now() WHERE id = $1`,
        [registration_id]
      );

      const regResult = await pool.query(
        `SELECT r.user_id, r.comp_id, c.name as comp_name
         FROM registrations r
         JOIN competitions c ON c.id = r.comp_id
         WHERE r.id = $1`,
        [registration_id]
      );

      if (regResult.rows.length > 0) {
        const { user_id, comp_id, comp_name } = regResult.rows[0];

        await pushService.sendPushNotification(
          user_id,
          "Payment Confirmed!",
          `Your payment for ${comp_name} has been confirmed. Your spot is secured!`,
          {
            type: "payment_success",
            compId: comp_id,
            registrationId: registration_id,
          }
        );
      }
    }

    console.log(
      `Payment webhook: order=${order_id} status=${newPaymentStatus} reg=${registration_id}`
    );
    res.json({ message: "OK" });
  } catch (err: any) {
    console.error("Payment webhook error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

// All routes below require auth ───────────────────────────────────────────────
router.use(authMiddleware);

// ── POST /api/payments/snap ───────────────────────────────────────────────────
router.post("/snap", async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      res.status(400).json({ message: "registrationId is required" });
      return;
    }

    const allowed = await canAccessRegistration(req.userId!, registrationId);
    if (!allowed) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    // Load registration + competition + student user
    const result = await pool.query(
      `SELECT
         r.id         AS reg_id,
         r.status     AS reg_status,
         c.name       AS competition_name,
         c.fee,
         u.full_name,
         u.email
       FROM registrations r
       JOIN competitions c ON c.id = r.comp_id
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1`,
      [registrationId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    const row = result.rows[0];

    if (row.fee === 0) {
      res.status(400).json({ message: "This competition is free — no payment required" });
      return;
    }

    if (["approved", "completed", "paid"].includes(row.reg_status)) {
      res.status(400).json({ message: "This registration has already been finalized" });
      return;
    }

    if (row.reg_status === "pending_approval") {
      res.status(400).json({ message: "Your registration is awaiting admin approval. Payment will be available once approved." });
      return;
    }

    // Re-use an existing pending Snap token to avoid duplicate charges
    const existing = await pool.query(
      `SELECT id, snap_token, order_id FROM payments
       WHERE registration_id = $1
         AND payment_status = 'pending'
         AND snap_token IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [registrationId]
    );

    if (existing.rows.length > 0) {
      const { id, snap_token, order_id } = existing.rows[0];
      const subdomain = env.MIDTRANS_IS_PRODUCTION ? "app" : "app.sandbox";
      res.json({
        snapToken:   snap_token,
        redirectUrl: `https://${subdomain}.midtrans.com/snap/v2/vtweb/${snap_token}`,
        paymentId:   id,
        orderId:     order_id,
      });
      return;
    }

    // Generate a unique order_id — Midtrans rejects reused order_ids after expiry
    const orderId = `PAY-${registrationId}-${Date.now()}`.slice(0, 50);

    const { snapToken, redirectUrl } = await createSnapToken({
      orderId,
      amount:          row.fee,
      customerName:    row.full_name,
      customerEmail:   row.email,
      competitionName: row.competition_name,
    });

    const paymentResult = await pool.query(
      `INSERT INTO payments
         (registration_id, user_id, amount, payment_status, snap_token, order_id)
       VALUES ($1, $2, $3, 'pending', $4, $5)
       RETURNING id`,
      [registrationId, req.userId, row.fee, snapToken, orderId]
    );

    res.status(201).json({
      snapToken,
      redirectUrl,
      paymentId: paymentResult.rows[0].id,
      orderId,
    });
  } catch (err: any) {
    console.error("Create snap token error:", err);
    res.status(500).json({ message: err.message || "Failed to create payment" });
  }
});


// ── GET /api/payments/verify/:registrationId ─────────────────────────────────
// Polls Midtrans Status API and syncs DB — fixes sandbox where webhook can't reach localhost.
// Returns { status } where status is the current registrations.status value.
router.get("/verify/:registrationId", async (req: Request, res: Response) => {
  try {
    const registrationId = req.params.registrationId as string;

    // Ensure this registration belongs to the authenticated user (or a linked parent)
    const accessible = await canAccessRegistration(req.userId!, registrationId);
    if (!accessible) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    // Look up payment record
    const payRow = await pool.query(
      `SELECT p.order_id, r.status as reg_status
       FROM payments p
       JOIN registrations r ON r.id = p.registration_id
       WHERE p.registration_id = $1
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [registrationId]
    );

    if (payRow.rows.length === 0) {
      res.json({ status: "no_payment" });
      return;
    }

    const { order_id, reg_status } = payRow.rows[0];

    // If already paid in DB, nothing to do
    if (reg_status === "paid") {
      res.json({ status: "paid" });
      return;
    }

    // Ask Midtrans for the real transaction status
    let txStatus: string;
    try {
      txStatus = await getTransactionStatus(order_id);
    } catch {
      // Midtrans returns 404 if transaction doesn't exist yet — not an error
      res.json({ status: reg_status });
      return;
    }

    const isSettled =
      txStatus === "settlement" ||
      txStatus === "capture";

    if (isSettled) {
      // Update DB to match Midtrans — same logic as webhook
      await pool.query(
        `UPDATE payments SET payment_status = 'settlement', updated_at = now()
         WHERE order_id = $1`,
        [order_id]
      );
      await pool.query(
        `UPDATE registrations SET status = 'paid', updated_at = now() WHERE id = $1`,
        [registrationId]
      );
      console.log(`Verify endpoint: forced paid for registration ${registrationId} (order ${order_id})`);
      res.json({ status: "paid" });
      return;
    }

    res.json({ status: reg_status });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

// ── GET /api/payments/redirect/:registrationId ───────────────────────────────
// T9: Returns a short-lived redirect URL (1 h JWT) for the organizer's post-payment page.
// Mobile app shows a "Continue to organizer portal" button using this URL.
router.get("/redirect/:registrationId", async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.params;

    // Verify registration belongs to this user and payment has settled
    const result = await pool.query(
      `SELECT r.id, r.comp_id, r.registration_number,
              c.post_payment_redirect_url,
              p.payment_status
       FROM registrations r
       JOIN competitions c ON c.id = r.comp_id
       LEFT JOIN payments p ON p.registration_id = r.id
       WHERE r.id = $1 AND r.user_id = $2
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [registrationId, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    const row = result.rows[0];

    if (!["settlement", "capture"].includes(row.payment_status)) {
      res.status(400).json({ message: "Payment has not been settled yet" });
      return;
    }

    if (!row.post_payment_redirect_url) {
      res.json({ redirectUrl: null, message: "No redirect URL configured for this competition" });
      return;
    }

    // Generate a 1-hour JWT embedding the registration context
    const redirectToken = jwt.sign(
      { sub: req.userId, registrationId, compId: row.comp_id },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Persist the latest token so organizer portals can optionally verify it server-side
    await pool.query(
      "UPDATE registrations SET redirect_token = $1 WHERE id = $2",
      [redirectToken, registrationId]
    );

    const separator = row.post_payment_redirect_url.includes("?") ? "&" : "?";
    const redirectUrl = `${row.post_payment_redirect_url}${separator}token=${redirectToken}`;

    res.json({
      redirectUrl,
      registrationNumber: row.registration_number,
    });
  } catch (err) {
    console.error("GET /payments/redirect/:registrationId error:", err);
    res.status(500).json({ message: "Failed to generate redirect URL" });
  }
});

// ── POST /api/payments/school-batch ─────────────────────────────────────────
// School admin creates a batch payment for multiple student registrations.
// Body: { registrationIds: string[] }
// Returns: { batchId, snapToken, snapRedirectUrl, totalAmount }
router.post(
  "/school-batch",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const actorId = req.userId!;
      const actorRole = (req as any).userRole as string;

      if (actorRole !== "school_admin" && actorRole !== "teacher") {
        res.status(403).json({ message: "Only school admins or teachers can create batch payments" });
        return;
      }

      const { registrationIds } = req.body as { registrationIds: string[] };

      if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
        res.status(400).json({ message: "registrationIds must be a non-empty array" });
        return;
      }

      // Load each registration with status + fee
      const regsResult = await pool.query(
        `SELECT r.id, r.user_id, r.status, r.comp_id,
                c.fee AS competition_fee, u.school_id AS student_school_id
         FROM registrations r
         JOIN users u ON u.id = r.user_id
         JOIN competitions c ON c.id = r.comp_id
         WHERE r.id = ANY($1::uuid[])`,
        [registrationIds]
      );

      if (regsResult.rows.length !== registrationIds.length) {
        res.status(404).json({ message: "One or more registrations not found" });
        return;
      }

      if (actorRole === "school_admin") {
        // Fetch admin's school_id and validate students belong to this school
        const adminRow = await pool.query(
          "SELECT school_id FROM users WHERE id = $1",
          [actorId]
        );
        if (!adminRow.rows[0]?.school_id) {
          res.status(403).json({ message: "Your account is not linked to a school" });
          return;
        }
        const schoolId: string = adminRow.rows[0].school_id;
        for (const row of regsResult.rows) {
          if (row.student_school_id !== schoolId) {
            res.status(403).json({
              message: `Registration ${row.id} does not belong to a student in your school`,
            });
            return;
          }
        }
      } else {
        // Teacher: validate all students are in teacher_student_links
        const linkedResult = await pool.query(
          `SELECT student_id FROM teacher_student_links WHERE teacher_id = $1`,
          [actorId]
        );
        const linkedIds = new Set(linkedResult.rows.map((r: { student_id: string }) => r.student_id));
        for (const row of regsResult.rows) {
          if (!linkedIds.has(row.user_id)) {
            res.status(403).json({
              message: `Registration ${row.id} does not belong to one of your linked students`,
            });
            return;
          }
        }
      }

      for (const row of regsResult.rows) {
        if (!["registered", "pending_payment"].includes(row.status)) {
          res.status(400).json({
            message: `Registration ${row.id} has status '${row.status}' and cannot be batched`,
          });
          return;
        }
      }

      // Use school_id from first student's record for the batch (teachers may span schools)
      const schoolId: string = regsResult.rows[0].student_school_id;

      const totalAmount: number = regsResult.rows.reduce(
        (sum: number, r: { competition_fee: number }) => sum + Number(r.competition_fee),
        0
      );

      // Fetch actor email for Midtrans customer details
      const actorEmailRow = await pool.query(
        "SELECT email, full_name FROM users WHERE id = $1",
        [actorId]
      );
      const adminEmail: string = actorEmailRow.rows[0]?.email ?? "";
      const adminName: string = actorEmailRow.rows[0]?.full_name ?? "School User";

      // Create Midtrans Snap token for the total
      const orderId = `BATCH-${Date.now()}`;
      const snapResult = await createSnapToken({
        orderId,
        amount: totalAmount,
        customerName: adminName,
        customerEmail: adminEmail,
        competitionName: `School Batch (${registrationIds.length} registrations)`,
      });

      // Persist the batch
      const batchResult = await pool.query(
        `INSERT INTO school_payment_batches
           (school_id, created_by, total_amount, status, snap_token, snap_redirect_url)
         VALUES ($1, $2, $3, 'pending', $4, $5)
         RETURNING id`,
        [schoolId, actorId, totalAmount, snapResult.snapToken, snapResult.redirectUrl]
      );
      const batchId: string = batchResult.rows[0].id;

      // Insert batch items
      for (const row of regsResult.rows) {
        await pool.query(
          `INSERT INTO school_payment_batch_items (batch_id, registration_id, amount)
           VALUES ($1, $2, $3)`,
          [batchId, row.id, Number(row.competition_fee)]
        );
        // Mark each registration as pending_payment so it can't be double-batched
        await pool.query(
          "UPDATE registrations SET status = 'pending_payment' WHERE id = $1",
          [row.id]
        );
      }

      res.status(201).json({
        batchId,
        snapToken: snapResult.snapToken,
        snapRedirectUrl: snapResult.redirectUrl,
        totalAmount,
      });
    } catch (err) {
      console.error("POST /payments/school-batch error:", err);
      res.status(500).json({ message: "Failed to create school payment batch" });
    }
  }
);

export default router;
