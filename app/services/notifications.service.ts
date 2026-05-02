/**
 * Notifications Service
 * Sprint 3, Track B, Phase 3
 *
 * Frontend service for in-app notification inbox API calls.
 */

import { apiRequest } from "./api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get user's notifications (paginated)
 */
export async function getNotifications(
  limit: number = 50,
  offset: number = 0
): Promise<NotificationsResponse> {
  const response = await apiRequest<NotificationsResponse>(
    `/notifications?limit=${limit}&offset=${offset}`,
    { method: "GET" }
  );
  return response;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await apiRequest(`/notifications/${notificationId}/read`, { method: "POST" });
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<{ count: number }> {
  const response = await apiRequest<{ message: string; count: number }>(
    "/notifications/read-all",
    { method: "POST" }
  );
  return { count: response.count };
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await apiRequest(`/notifications/${notificationId}`, { method: "DELETE" });
}
