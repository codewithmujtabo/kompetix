import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import * as notificationsService from "@/services/notifications.service";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useUser();
  const userId = (user as any)?.id;
  const userRole = (user as any)?.role;

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationsService.getNotifications(50, 0),
    enabled: !!userId,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      }
    }, [queryClient, userId])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePressNotification = async (item: notificationsService.Notification) => {
    if (!item.read) {
      await notificationsService.markAsRead(item.id);
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    }

    const compId = item.data?.compId;
    const studentId = item.data?.studentId;
    const type = item.type;

    if (userRole === "parent") {
      if (type.startsWith("child_")) {
        router.push({
          pathname: "/(tabs)/children",
          params: {
            studentId: studentId ?? "",
            compId: compId ?? "",
          },
        });
        return;
      }

      if (type.startsWith("parent_link_")) {
        router.push("/(tabs)/children");
        return;
      }
    }

    if (compId && (type.includes("competition") || type.includes("registration") || type.includes("deadline"))) {
      router.push({
        pathname: "/(tabs)/competitions/[id]",
        params: { id: compId },
      });
      return;
    }

    if (type.includes("payment")) {
      router.push("/(tabs)/my-competitions");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Failed to load notifications</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={async () => {
              await notificationsService.markAllAsRead();
              queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
            }}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyBody}>
            {userRole === "parent"
              ? "Updates about your linked children, approvals, and competition progress will appear here."
              : "Registration updates, reminders, and alerts will appear here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Brand.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePressNotification(item)}
              style={[styles.card, !item.read && styles.cardUnread]}
            >
              <View style={styles.cardRow}>
                {!item.read && <View style={styles.unreadDot} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBody}>{item.body}</Text>
                  <Text style={styles.cardMeta}>
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  markAllText: {
    color: Brand.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 30,
    gap: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardUnread: {
    backgroundColor: "#F8FBFF",
    borderColor: "#DBEAFE",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.primary,
    marginTop: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 20,
    color: "#475569",
    marginBottom: 8,
  },
  cardMeta: {
    fontSize: 12,
    color: "#94A3B8",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: Brand.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
