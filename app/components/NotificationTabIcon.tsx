/**
 * NotificationTabIcon
 * Sprint 3, Track B, Phase 3 (T8.8)
 *
 * Tab bar icon for notifications with unread badge.
 */

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useUser } from "@/context/AuthContext";
import * as notificationsService from "@/services/notifications.service";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface NotificationTabIconProps {
  color: string;
  focused: boolean;
}

export function NotificationTabIcon({ color, focused }: NotificationTabIconProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useUser();
  const userId = (user as any)?.id;

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    loadUnreadCount();

    // Poll for unread count every 30 seconds when tab is focused
    const interval = setInterval(() => {
      if (focused) {
        loadUnreadCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [focused, userId]);

  async function loadUnreadCount() {
    try {
      const response = await notificationsService.getNotifications(1, 0);
      setUnreadCount(response.unreadCount);
    } catch (err) {
      // Silently fail — don't show badge on error
      console.warn("Failed to load unread count:", err);
    }
  }

  return (
    <View style={styles.container}>
      <IconSymbol size={26} name="bell.fill" color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
