/**
 * Cron Service
 * Sprint 3, Track A, Phase 4 (T4.5, T4.6)
 *
 * Scheduled tasks for sending deadline and competition day reminders.
 */

import cron from "node-cron";
import { pool } from "../config/database";
import * as pushService from "./push.service";
import * as recommendationsService from "./recommendations.service";
import { processPendingJobs } from "./bulk-processor.service";

/**
 * T4.5 — Send deadline reminders (3 days before registration close)
 * Runs daily at 9:00 AM to check for upcoming deadlines
 */
export function scheduleDeadlineReminders() {
  // Run every day at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    try {
      console.log("[Cron] Running deadline reminder job...");

      // Find competitions closing in exactly 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(0, 0, 0, 0); // Start of day

      const endOfDay = new Date(threeDaysFromNow);
      endOfDay.setHours(23, 59, 59, 999); // End of day

      const result = await pool.query(
        `SELECT id, name, reg_close FROM competitions
         WHERE reg_close >= $1 AND reg_close <= $2`,
        [threeDaysFromNow.toISOString(), endOfDay.toISOString()]
      );

      if (result.rows.length === 0) {
        console.log("[Cron] No competitions closing in 3 days");
        return;
      }

      // For each competition, get all registered users
      for (const comp of result.rows) {
        const userResult = await pool.query(
          `SELECT DISTINCT user_id FROM registrations WHERE comp_id = $1`,
          [comp.id]
        );

        if (userResult.rows.length === 0) {
          continue;
        }

        const userIds = userResult.rows.map((r) => r.user_id);

        // Send batch notification
        const sent = await pushService.sendBatchNotifications(
          userIds,
          "Registration Closing Soon!",
          `Registration for ${comp.name} closes in 3 days. Complete your payment if needed.`,
          { type: "deadline_reminder", compId: comp.id }
        );

        console.log(`[Cron] Sent ${sent} deadline reminders for ${comp.name}`);
      }
    } catch (error: any) {
      console.error("[Cron] Deadline reminder job failed:", error.message);
    }
  });

  console.log("[Cron] Deadline reminder job scheduled (daily at 9:00 AM)");
}

/**
 * T4.6 — Send competition day reminders (1 day before start)
 * Runs daily at 9:00 AM to check for upcoming competitions
 */
export function scheduleCompetitionDayReminders() {
  // Run every day at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    try {
      console.log("[Cron] Running competition day reminder job...");

      // Find competitions starting in exactly 1 day
      const oneDayFromNow = new Date();
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
      oneDayFromNow.setHours(0, 0, 0, 0); // Start of day

      const endOfDay = new Date(oneDayFromNow);
      endOfDay.setHours(23, 59, 59, 999); // End of day

      const result = await pool.query(
        `SELECT id, name, start_date FROM competitions
         WHERE start_date >= $1 AND start_date <= $2`,
        [oneDayFromNow.toISOString(), endOfDay.toISOString()]
      );

      if (result.rows.length === 0) {
        console.log("[Cron] No competitions starting in 1 day");
        return;
      }

      // For each competition, get all paid/registered users
      for (const comp of result.rows) {
        const userResult = await pool.query(
          `SELECT DISTINCT user_id FROM registrations
           WHERE comp_id = $1 AND status IN ('paid', 'registered')`,
          [comp.id]
        );

        if (userResult.rows.length === 0) {
          continue;
        }

        const userIds = userResult.rows.map((r) => r.user_id);

        // Send batch notification
        const sent = await pushService.sendBatchNotifications(
          userIds,
          "Competition Tomorrow!",
          `${comp.name} starts tomorrow. Good luck!`,
          { type: "competition_reminder", compId: comp.id }
        );

        console.log(`[Cron] Sent ${sent} competition reminders for ${comp.name}`);
      }
    } catch (error: any) {
      console.error("[Cron] Competition day reminder job failed:", error.message);
    }
  });

  console.log("[Cron] Competition day reminder job scheduled (daily at 9:00 AM)");
}

/**
 * Sprint 4, Track C (T11) - Send scheduled notifications
 * Runs every 5 minutes to check for pending scheduled notifications
 */
export function scheduleNotificationSender() {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("[Cron] Running scheduled notification sender...");

      // Find notifications that are ready to send
      const result = await pool.query(
        `SELECT id, user_id, type, title, body, data
         FROM notifications
         WHERE sent = FALSE
         AND scheduled_for IS NOT NULL
         AND scheduled_for <= NOW()
         ORDER BY scheduled_for ASC
         LIMIT 50`,
        []
      );

      if (result.rows.length === 0) {
        console.log("[Cron] No scheduled notifications to send");
        return;
      }

      console.log(`[Cron] Found ${result.rows.length} scheduled notifications to send`);

      // Process each notification
      for (const notification of result.rows) {
        try {
          const { id, user_id, type, title, body, data } = notification;
          const notifData = typeof data === 'string' ? JSON.parse(data) : (data || {});

          // Handle post-registration nudge (T9)
          if (type === "post_registration_nudge" && notifData.compId) {
            const similarComps = await recommendationsService.getSimilarCompetitions(
              notifData.compId,
              user_id,
              3
            );

            if (similarComps.length > 0) {
              // Build notification body with similar competitions
              const compNames = similarComps
                .map((c, i) => `${i + 1}. ${c.name}`)
                .join("\n");

              const enhancedBody = `${body}\n\n${compNames}`;

              // Send the notification
              await pushService.sendPushNotification(
                user_id,
                title,
                enhancedBody,
                {
                  ...notifData,
                  suggestions: similarComps.map((c) => ({
                    id: c.id,
                    name: c.name,
                  })),
                }
              );

              // Mark as sent
              await pool.query(
                `UPDATE notifications SET sent = TRUE WHERE id = $1`,
                [id]
              );

              console.log(`[Cron] Sent post-registration nudge to user ${user_id}`);
            } else {
              // No similar competitions found, mark as sent anyway
              await pool.query(
                `UPDATE notifications SET sent = TRUE WHERE id = $1`,
                [id]
              );
            }
          } else {
            // Generic scheduled notification
            await pushService.sendPushNotification(
              user_id,
              title,
              body,
              notifData
            );

            // Mark as sent
            await pool.query(
              `UPDATE notifications SET sent = TRUE WHERE id = $1`,
              [id]
            );

            console.log(`[Cron] Sent scheduled notification to user ${user_id}`);
          }
        } catch (error: any) {
          console.error(`[Cron] Failed to send notification ${notification.id}:`, error.message);
          // Continue with next notification
        }
      }
    } catch (error: any) {
      console.error("[Cron] Scheduled notification sender failed:", error.message);
    }
  });

  console.log("[Cron] Scheduled notification sender job scheduled (every 5 minutes)");
}

/**
 * Sprint 4, Track E (T15, T16) - Send deadline urgency reminders
 * Sends reminders to users who viewed competitions but didn't register
 * Runs daily at 10:00 AM
 */
export function scheduleDeadlineUrgencyReminders() {
  // Run every day at 10:00 AM
  cron.schedule("0 10 * * *", async () => {
    try {
      console.log("[Cron] Running deadline urgency reminder job...");

      // T15 - Find competitions closing in 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(0, 0, 0, 0);

      const endOfDay3 = new Date(threeDaysFromNow);
      endOfDay3.setHours(23, 59, 59, 999);

      // T16 - Find competitions closing in 1 day
      const oneDayFromNow = new Date();
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
      oneDayFromNow.setHours(0, 0, 0, 0);

      const endOfDay1 = new Date(oneDayFromNow);
      endOfDay1.setHours(23, 59, 59, 999);

      // Get competitions for both timeframes
      const compsResult = await pool.query(
        `SELECT id, name, reg_close_date,
         CASE
           WHEN reg_close_date >= $1 AND reg_close_date <= $2 THEN 3
           WHEN reg_close_date >= $3 AND reg_close_date <= $4 THEN 1
           ELSE 0
         END as days_until_close
         FROM competitions
         WHERE (
           (reg_close_date >= $1 AND reg_close_date <= $2)
           OR (reg_close_date >= $3 AND reg_close_date <= $4)
         )`,
        [
          threeDaysFromNow.toISOString(),
          endOfDay3.toISOString(),
          oneDayFromNow.toISOString(),
          endOfDay1.toISOString(),
        ]
      );

      if (compsResult.rows.length === 0) {
        console.log("[Cron] No competitions closing soon");
        return;
      }

      let totalSent = 0;

      // Process each competition
      for (const comp of compsResult.rows) {
        const { id, name, days_until_close } = comp;

        // Find users who viewed this competition but didn't register
        // Only include views that lasted >= 10 seconds
        const viewersResult = await pool.query(
          `SELECT DISTINCT cv.user_id
           FROM competition_views cv
           WHERE cv.comp_id = $1
           AND cv.view_duration_seconds >= 10
           AND cv.user_id NOT IN (
             SELECT user_id FROM registrations WHERE comp_id = $1
           )
           AND cv.user_id IN (
             SELECT id FROM users WHERE push_token IS NOT NULL
           )
           AND cv.user_id NOT IN (
             SELECT user_id FROM notifications
             WHERE type = 'deadline_urgency'
             AND data->>'compId' = $1
             AND created_at > NOW() - INTERVAL '24 hours'
           )`,
          [id]
        );

        if (viewersResult.rows.length === 0) {
          continue;
        }

        const userIds = viewersResult.rows.map((r) => r.user_id);

        // Send appropriate message based on days until close
        let title, body;
        if (days_until_close === 3) {
          title = "Registration closes in 3 days!";
          body = `Don't miss ${name} - register now before it's too late.`;
        } else {
          // 1 day
          title = "Last chance! Registration closes tomorrow";
          body = `Final reminder: ${name} registration closes in 1 day.`;
        }

        // Send batch notification
        const sent = await pushService.sendBatchNotifications(
          userIds,
          title,
          body,
          { type: "deadline_urgency", compId: id }
        );

        totalSent += sent;

        console.log(
          `[Cron] Sent ${sent} deadline urgency reminders (${days_until_close} days) for ${name}`
        );
      }

      console.log(`[Cron] Total deadline urgency reminders sent: ${totalSent}`);
    } catch (error: any) {
      console.error("[Cron] Deadline urgency reminder job failed:", error.message);
    }
  });

  console.log("[Cron] Deadline urgency reminder job scheduled (daily at 10:00 AM)");
}

/**
 * Sprint 5, Track B - Process bulk registration jobs
 * Runs every minute to check for pending jobs
 */
export function scheduleBulkJobProcessor() {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      await processPendingJobs();
    } catch (error: any) {
      console.error("[Cron] Bulk job processor failed:", error.message);
    }
  });

  console.log("[Cron] Bulk job processor scheduled (every minute)");
}

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  scheduleDeadlineReminders();
  scheduleCompetitionDayReminders();
  scheduleNotificationSender();
  scheduleDeadlineUrgencyReminders();
  scheduleBulkJobProcessor();
  console.log("[Cron] All cron jobs initialized");
}
