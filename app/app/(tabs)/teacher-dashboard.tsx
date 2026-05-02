import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Brand } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useUser } from "@/context/AuthContext";
import {
  getKeyMetrics,
  getUpcomingDeadlines,
  getRecentActivities,
} from "@/services/teachers.service";

export default function TeacherDashboardScreen() {
  const { user } = useUser();
  const userRole = (user as any)?.role;

  // Fetch dashboard data (hooks must be called before any returns)
  const { data: keyMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["keyMetrics"],
    queryFn: getKeyMetrics,
    enabled: userRole === "teacher", // Only fetch if teacher
  });

  const { data: upcomingDeadlines, isLoading: isLoadingDeadlines } = useQuery({
    queryKey: ["upcomingDeadlines"],
    queryFn: getUpcomingDeadlines,
    enabled: userRole === "teacher",
  });

  const { data: recentActivities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ["recentActivities"],
    queryFn: getRecentActivities,
    enabled: userRole === "teacher",
  });

  // Redirect non-teachers away from this screen
  useEffect(() => {
    if (userRole && userRole !== "teacher") {
      if (userRole === "parent") {
        router.replace("/(tabs)/children");
      } else if (userRole === "school_admin") {
        router.replace("/(tabs)/profile");
      } else {
        router.replace("/(tabs)/competitions");
      }
    }
  }, [userRole]);

  // Don't render if not a teacher
  if (userRole && userRole !== "teacher") {
    return null;
  }

  const quickActions = [
    {
      id: "bulk-register",
      icon: "person.3.fill",
      title: "Bulk Registration",
      subtitle: "Register multiple students",
      color: "#4F46E5",
      onPress: () => router.push("/bulk-registration"),
    },
    {
      id: "view-students",
      icon: "list.bullet",
      title: "View All Students",
      subtitle: "See complete student list",
      color: "#10B981",
      onPress: () => router.push("/(tabs)/teacher-students"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Overview of student activities and tasks
          </Text>
        </View>

        {/* Key Metrics */}
        {isLoadingMetrics ? (
          <ActivityIndicator style={styles.loader} color={Brand.primary} />
        ) : (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <IconSymbol name="chart.bar.fill" size={24} color={Brand.primary} />
              </View>
              <Text style={styles.metricValue}>{keyMetrics?.totalRegistrations || 0}</Text>
              <Text style={styles.metricLabel}>Total Registrations</Text>
              <Text
                style={[
                  styles.metricChange,
                  keyMetrics && keyMetrics.percentChange < 0 && styles.metricChangeNegative,
                ]}
              >
                {keyMetrics && keyMetrics.percentChange >= 0 ? "+" : ""}
                {keyMetrics?.percentChange || 0}% this month
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <IconSymbol name="person.3.fill" size={24} color="#10B981" />
              </View>
              <Text style={styles.metricValue}>{keyMetrics?.activeStudents || 0}</Text>
              <Text style={styles.metricLabel}>Active Students</Text>
              <Text style={styles.metricChange}>Last 30 days</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <IconSymbol name="star.fill" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.metricValue}>{keyMetrics?.averagePerStudent || "0.0"}</Text>
              <Text style={styles.metricLabel}>Avg per Student</Text>
              <Text style={styles.metricChange}>Registration rate</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={action.onPress}
              >
                <View
                  style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}
                >
                  <IconSymbol name={action.icon as any} size={28} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Deadlines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
          <Text style={styles.sectionSubtitle}>Competitions closing soon</Text>

          {isLoadingDeadlines ? (
            <ActivityIndicator style={styles.loader} color={Brand.primary} />
          ) : upcomingDeadlines && upcomingDeadlines.length > 0 ? (
            upcomingDeadlines.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.deadlineCard}>
                <View style={styles.deadlineHeader}>
                  <View style={styles.deadlineInfo}>
                    <Text style={styles.deadlineName}>{item.competition}</Text>
                    <Text style={styles.deadlineDate}>{item.deadline}</Text>
                  </View>
                  <View
                    style={[
                      styles.deadlineBadge,
                      {
                        backgroundColor:
                          item.status === "urgent" ? "#FEE2E2" : "#DBEAFE",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deadlineBadgeText,
                        {
                          color: item.status === "urgent" ? "#EF4444" : "#3B82F6",
                        },
                      ]}
                    >
                      {item.daysLeft}d left
                    </Text>
                  </View>
                </View>

                <View style={styles.deadlineFooter}>
                  <IconSymbol name="person.2.fill" size={16} color="#64748B" />
                  <Text style={styles.deadlineCount}>
                    {item.registeredCount} students registered
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No upcoming deadlines</Text>
            </View>
          )}
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>

          {isLoadingActivities ? (
            <ActivityIndicator style={styles.loader} color={Brand.primary} />
          ) : recentActivities && recentActivities.length > 0 ? (
            recentActivities.slice(0, 3).map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: `${activity.color}15` },
                  ]}
                >
                  <IconSymbol
                    name={activity.icon as any}
                    size={20}
                    color={activity.color}
                  />
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityAction}>{activity.action}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recent activities</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  loader: {
    marginVertical: 40,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIconContainer: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "600",
  },
  metricChangeNegative: {
    color: "#EF4444",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  deadlineCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  deadlineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  deadlineDate: {
    fontSize: 13,
    color: "#64748B",
  },
  deadlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deadlineBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deadlineFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  deadlineCount: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 6,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: "#94A3B8",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
  },
});
