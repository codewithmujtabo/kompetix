import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Brand } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getRecentActivities, getUpcomingDeadlines } from "@/services/teachers.service";

export default function TeacherActionsScreen() {
  // Fetch recent activities and upcoming deadlines
  const { data: recentActivities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ["recentActivities"],
    queryFn: getRecentActivities,
  });

  const { data: upcomingDeadlines, isLoading: isLoadingDeadlines } = useQuery({
    queryKey: ["upcomingDeadlines"],
    queryFn: getUpcomingDeadlines,
  });

  const quickActions = [
    {
      id: "web-portal",
      icon: "globe",
      title: "Bulk Registration",
      subtitle: "Use the web portal to register multiple students via CSV",
      color: "#4F46E5",
      onPress: () => Linking.openURL("https://kompetix.id/teacher"),
    },
    {
      id: "export-data",
      icon: "arrow.down.doc.fill",
      title: "Export Student Data",
      subtitle: "Download CSV of all students",
      color: "#10B981",
      onPress: () => Linking.openURL("https://kompetix.id/teacher"),
    },
    {
      id: "send-reminder",
      icon: "bell.badge.fill",
      title: "Send Reminder",
      subtitle: "Notify students about deadlines",
      color: "#F59E0B",
      onPress: () => {
        console.log("Send reminder — coming soon");
      },
    },
    {
      id: "view-reports",
      icon: "chart.bar.fill",
      title: "View Reports",
      subtitle: "Detailed performance reports",
      color: "#8B5CF6",
      onPress: () => {
        router.push("/(tabs)/teacher-analytics");
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quick Actions</Text>
          <Text style={styles.headerSubtitle}>
            Fast access to common tasks
          </Text>
        </View>

        {/* Web portal banner */}
        <TouchableOpacity
          style={styles.webPortalBanner}
          onPress={() => Linking.openURL("https://kompetix.id/teacher")}
          activeOpacity={0.8}
        >
          <View style={styles.webPortalBannerContent}>
            <Text style={styles.webPortalBannerTitle}>Full features on the web portal</Text>
            <Text style={styles.webPortalBannerBody}>
              Bulk registration, CSV export, and advanced reports are available at kompetix.id/teacher
            </Text>
          </View>
          <Text style={styles.webPortalBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* Quick Actions Grid */}
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
                <IconSymbol
                  name={action.icon as any}
                  size={28}
                  color={action.color}
                />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Deadlines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
          <Text style={styles.sectionSubtitle}>
            Competitions closing soon
          </Text>

          {isLoadingDeadlines ? (
            <ActivityIndicator style={styles.loader} color={Brand.primary} />
          ) : upcomingDeadlines && upcomingDeadlines.length > 0 ? (
            upcomingDeadlines.map((item) => (
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
          <Text style={styles.sectionSubtitle}>
            Your recent actions and updates
          </Text>

          {isLoadingActivities ? (
            <ActivityIndicator style={styles.loader} color={Brand.primary} />
          ) : recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
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
                  <Text style={styles.activityCompetition}>
                    {activity.competition}
                  </Text>
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
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Brand.primary,
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
  webPortalBanner: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  webPortalBannerContent: { flex: 1, marginRight: 8 },
  webPortalBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3730A3",
    marginBottom: 4,
  },
  webPortalBannerBody: {
    fontSize: 12,
    color: "#4338CA",
    lineHeight: 18,
  },
  webPortalBannerArrow: { fontSize: 22, color: "#4338CA", fontWeight: "700" },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    width: "48%",
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
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  section: {
    marginBottom: 32,
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
    marginBottom: 16,
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
    marginBottom: 2,
  },
  activityCompetition: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: "#94A3B8",
  },
  loader: {
    marginVertical: 40,
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
