/**
 * Push notification service for registering and managing device tokens.
 * Sprint 3, Track A, Phase 2
 */

import { API_BASE_URL } from "@/config/api";
import * as TokenService from "./token.service";

/**
 * Register or update the user's push notification token.
 * Called after login/signup to enable push notifications.
 *
 * @param pushToken - Expo Push Token (e.g., "ExponentPushToken[...]")
 */
export async function registerPushToken(pushToken: string): Promise<void> {
  const token = await TokenService.getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/users/push-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pushToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to register push token");
  }

  console.log("Push token registered successfully");
}

/**
 * Clear the user's push token (called on logout).
 * Optional — prevents notifications to logged-out devices.
 */
export async function clearPushToken(): Promise<void> {
  const token = await TokenService.getToken();
  if (!token) {
    return; // Already logged out
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/push-token`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log("Push token cleared successfully");
    }
  } catch (error) {
    // Non-fatal — don't block logout if this fails
    console.warn("Failed to clear push token:", error);
  }
}
