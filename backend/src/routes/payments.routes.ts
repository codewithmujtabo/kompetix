import crypto from "crypto";
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { pool } from "../config/database";
import { env } from "../config/env";
import { authMiddleware } from "../middleware/auth";
import { createSnapToken } from "../services/midtrans.service";
import * as pushService from "../services/push.service";
import { userUploadDir } from "../services/storage.service";

const router = Router();

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

    // ── Notify student to upload proof after payment ───────────────────────
    if (isSuccess) {
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
          "Payment Recorded",
          `Your payment for ${comp_name} was recorded. Upload your screenshot or receipt so admin can review your application.`,
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

// ── POST /api/payments/manual-intent ─────────────────────────────────────────
router.post("/manual-intent", async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      res.status(400).json({ message: "registrationId is required" });
      return;
    }

    const registrationResult = await pool.query(
      `SELECT
         r.id,
         r.status,
         r.user_id,
         c.fee,
         c.name as competition_name
       FROM registrations r
       JOIN competitions c ON c.id = r.comp_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [registrationId, req.userId]
    );

    if (registrationResult.rows.length === 0) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    const registration = registrationResult.rows[0];

    if (registration.fee === 0) {
      res.status(400).json({ message: "This competition does not require payment" });
      return;
    }

    const existingPayment = await pool.query(
      `SELECT id, amount, payment_status, payment_proof_url
       FROM payments
       WHERE registration_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [registrationId]
    );

    if (existingPayment.rows.length > 0) {
      res.json({
        paymentId: existingPayment.rows[0].id,
        amount: existingPayment.rows[0].amount,
        paymentStatus: existingPayment.rows[0].payment_status,
        proofUrl: existingPayment.rows[0].payment_proof_url,
      });
      return;
    }

    res.status(400).json({
      message: "Complete the Midtrans payment first, then upload your screenshot or receipt.",
    });
  } catch (err: any) {
    console.error("Create manual payment intent error:", err);
    res.status(500).json({ message: err.message || "Failed to create payment intent" });
  }
});

// ── POST /api/payments/snap ───────────────────────────────────────────────────
router.post("/snap", async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      res.status(400).json({ message: "registrationId is required" });
      return;
    }

    // Load registration + competition + user
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
       WHERE r.id = $1 AND r.user_id = $2`,
      [registrationId, req.userId]
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

    if (row.reg_status === "pending_review") {
      res.status(400).json({ message: "Payment proof already submitted and awaiting review" });
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

// ── Multer config for payment proof uploads ──────────────────────────────────
const uploadProof = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      cb(null, userUploadDir(req.userId!));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext)
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()
        .slice(0, 40);
      cb(null, `proof-${Date.now()}-${base}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
  },
});

// ── POST /api/payments/:paymentId/upload-proof ───────────────────────────────
router.post(
  "/:paymentId/upload-proof",
  uploadProof.single("proof"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { paymentId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ message: "No proof file uploaded" });
        return;
      }

      // Verify payment exists and belongs to user
      const paymentResult = await pool.query(
        `SELECT p.*, r.comp_id, c.name as competition_name
         FROM payments p
         JOIN registrations r ON p.registration_id = r.id
         JOIN competitions c ON r.comp_id = c.id
         WHERE p.id = $1 AND p.user_id = $2`,
        [paymentId, userId]
      );

      if (paymentResult.rows.length === 0) {
        res.status(404).json({ message: "Payment not found" });
        return;
      }

      const payment = paymentResult.rows[0];
      const fileUrl = `/uploads/${userId}/${file.filename}`;

      // Update payment with proof URL
      await pool.query(
        `UPDATE payments
         SET payment_proof_url = $1, proof_submitted_at = now()
         WHERE id = $2`,
        [fileUrl, paymentId]
      );

      // Update registration status to pending_review
      await pool.query(
        `UPDATE registrations
         SET status = 'pending_review', updated_at = now()
         WHERE id = $1`,
        [payment.registration_id]
      );

      // Send notification to user
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          "proof_submitted",
          "Payment Proof Submitted",
          `Your payment proof for ${payment.competition_name} is under review. We'll notify you once it's verified.`,
          JSON.stringify({
            compId: payment.comp_id,
            registrationId: payment.registration_id,
          }),
        ]
      );

      const parentIds = await pushService.getActiveParentIdsForStudent(userId);
      if (parentIds.length > 0) {
        const studentResult = await pool.query(
          "SELECT full_name FROM users WHERE id = $1",
          [userId]
        );
        const studentName = studentResult.rows[0]?.full_name || "Your child";

        await pushService.sendBatchNotifications(
          parentIds,
          "Child Submitted Payment Proof",
          `${studentName} submitted payment proof for ${payment.competition_name}. The application is now under review.`,
          {
            type: "child_payment_proof_submitted",
            compId: payment.comp_id,
            registrationId: payment.registration_id,
            studentId: userId,
          }
        );
      }

      res.json({
        message: "Payment proof uploaded successfully",
        proofUrl: fileUrl,
        status: "pending_review",
      });
    } catch (err: any) {
      console.error("Upload proof error:", err);
      res.status(500).json({ message: err.message || "Failed to upload proof" });
    }
  }
);

// ── GET /api/payments/:paymentId/proof ───────────────────────────────────────
router.get("/:paymentId/proof", async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const userRole = req.userRole;
    const { paymentId } = req.params;

    const result = await pool.query(
      "SELECT payment_proof_url, user_id FROM payments WHERE id = $1",
      [paymentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    const payment = result.rows[0];

    // Only owner or admin can view proof
    if (payment.user_id !== userId && userRole !== "admin") {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    res.json({ proofUrl: payment.payment_proof_url });
  } catch (err) {
    console.error("Get proof error:", err);
    res.status(500).json({ message: "Failed to get proof" });
  }
});

export default router;
