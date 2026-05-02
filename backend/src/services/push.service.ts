/**
 * Push Notification Service
 * Sprint 3, Track A, Phase 3
 *
 * Sends push notifications to users via Expo Push Notification service.
 * Uses expo-server-sdk to handle token validation, batching, and delivery.
 */

import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushErrorReceipt } from "expo-server-sdk";
import { pool } from "../config/database";

// Create a new Expo SDK client
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional: for higher rate limits
});

/**
 * Send a push notification to a single user.
 * T3.3, T7.5
 *
 * @param userId - User ID to send notification to
 * @param title - Notification title
 * @param body - Notification body text
 * @param data - Optional additional data for deep linking
 * @returns true if sent successfully, false otherwise
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    // T7.5 — Store notification in database for in-app inbox
    const notificationType = data?.type || "general";
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, notificationType, title, body, data ? JSON.stringify(data) : null]
    );

    // Get user's push token from database
    const result = await pool.query(
      "SELECT push_token FROM users WHERE id = $1 AND push_token IS NOT NULL",
      [userId]
    );

    if (result.rows.length === 0) {
      console.warn(`User ${userId} has no push token registered`);
      // Still return true because notification was saved to inbox
      return true;
    }

    const pushToken = result.rows[0].push_token;

    // Validate token format (T3.5)
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid push token for user ${userId}: ${pushToken}`);
      // Clear invalid token from database
      await pool.query("UPDATE users SET push_token = NULL WHERE id = $1", [userId]);
      return false;
    }

    // Build the notification message
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: "default",
      title,
      body,
      data: data || {},
      priority: "high",
      channelId: "default", // Android notification channel
    };

    // Send the notification
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    const ticket = ticketChunk[0];

    // Handle errors (T3.5)
    if (ticket.status === "error") {
      console.error(`Error sending push notification to ${userId}:`, ticket.message);

      // If token is invalid, clear it from database
      if (ticket.details?.error === "DeviceNotRegistered") {
        await pool.query("UPDATE users SET push_token = NULL WHERE id = $1", [userId]);
      }

      return false;
    }

    console.log(`Push notification sent successfully to user ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`Failed to send push notification to user ${userId}:`, error.message);
    return false;
  }
}

/**
 * Send the same notification to multiple users in a batch.
 * T3.4, T7.5
 *
 * @param userIds - Array of user IDs
 * @param title - Notification title
 * @param body - Notification body text
 * @param data - Optional additional data for deep linking
 * @returns Number of notifications sent successfully
 */
export async function sendBatchNotifications(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<number> {
  if (userIds.length === 0) {
    return 0;
  }

  try {
    // T7.5 — Store notifications in database for in-app inbox (batch insert)
    const notificationType = data?.type || "general";
    const values = userIds
      .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
      .join(", ");
    const params = userIds.flatMap((userId) => [
      userId,
      notificationType,
      title,
      body,
    ]);

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ${values}`,
      params
    );

    // Get all push tokens for these users
    const result = await pool.query(
      "SELECT id, push_token FROM users WHERE id = ANY($1) AND push_token IS NOT NULL",
      [userIds]
    );

    if (result.rows.length === 0) {
      console.warn(`No users with push tokens found in batch of ${userIds.length}`);
      // Return userIds.length because notifications were saved to inbox
      return userIds.length;
    }

    const messages: ExpoPushMessage[] = [];
    const tokenToUserId = new Map<string, string>();

    // Build messages array
    for (const row of result.rows) {
      const { id, push_token } = row;

      // Validate token (T3.5)
      if (!Expo.isExpoPushToken(push_token)) {
        console.warn(`Invalid push token for user ${id}, skipping`);
        // Clear invalid token
        await pool.query("UPDATE users SET push_token = NULL WHERE id = $1", [id]);
        continue;
      }

      tokenToUserId.set(push_token, id);

      messages.push({
        to: push_token,
        sound: "default",
        title,
        body,
        data: data || {},
        priority: "high",
        channelId: "default",
      });
    }

    if (messages.length === 0) {
      console.warn("No valid push tokens found in batch");
      return 0;
    }

    // Send notifications in chunks of 100 (Expo's recommended batch size)
    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

        // Process tickets (T3.5 - error handling)
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const message = chunk[i];
          const userId = tokenToUserId.get(message.to as string);

          if (ticket.status === "ok") {
            successCount++;
          } else if (ticket.status === "error") {
            console.error(`Push error for user ${userId}:`, ticket.message);

            // Clear invalid tokens
            if (ticket.details?.error === "DeviceNotRegistered" && userId) {
              await pool.query("UPDATE users SET push_token = NULL WHERE id = $1", [userId]);
            }
          }
        }
      } catch (error: any) {
        console.error("Error sending notification chunk:", error.message);
        // Continue with next chunk (T3.6 - partial retry)
      }
    }

    console.log(`Batch notifications sent: ${successCount}/${messages.length} successful`);
    return successCount;
  } catch (error: any) {
    console.error("Failed to send batch notifications:", error.message);
    return 0;
  }
}

export async function getActiveParentIdsForStudent(studentId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT parent_id
     FROM parent_student_links
     WHERE student_id = $1 AND status = 'active'`,
    [studentId]
  );

  return result.rows.map((row) => row.parent_id);
}

/**
 * Retry failed notifications (T3.6).
 * Note: For production, implement a job queue (Bull, BullMQ) for robust retries.
 * This is a simple in-memory retry for MVP.
 */
export async function retryFailedNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Retry attempt ${attempt}/${maxRetries} for user ${userId}`);

    const success = await sendPushNotification(userId, title, body, data);

    if (success) {
      return true;
    }

    // Exponential backoff: wait 2^attempt seconds before retrying
    if (attempt < maxRetries) {
      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error(`Failed to send notification to user ${userId} after ${maxRetries} attempts`);
  return false;
}

/**
 * Helper: Get receipt status for sent notifications.
 * Can be used to check delivery status later (optional, for analytics).
 */
export async function getPushReceiptStatus(receiptIds: string[]): Promise<void> {
  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of receiptIdChunks) {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (const receiptId in receipts) {
        const receipt = receipts[receiptId];

        if (receipt.status === "error") {
          const errorReceipt = receipt as ExpoPushErrorReceipt;
          console.error(`Receipt error for ${receiptId}:`, errorReceipt.message);

          // Handle specific errors (DeviceNotRegistered, etc.)
          if (errorReceipt.details?.error === "DeviceNotRegistered") {
            // Token is no longer valid - should clear from database
            console.warn(`Device not registered: ${receiptId}`);
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Failed to get push receipts:", error.message);
  }
}
