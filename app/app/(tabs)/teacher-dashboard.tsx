import React, { useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { getDashboardSummary, getUpcomingDeadlines } from "@/services/teachers.service";

export default function TeacherDashboardScreen() {
  const { user } = useUser();
  const userRole = (user as any)?.role;

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["teacherSummary"],
    queryFn: getDashboardSummary,
    enabled: userRole === "teacher",
  });

  const { data: deadlines, isLoading: loadingDeadlines } = useQuery({
    queryKey: ["teacherDeadlines"],
    queryFn: getUpcomingDeadlines,
    enabled: userRole === "teacher",
  });

  useEffect(() => {
    if (userRole && userRole !== "teacher") {
      if (userRole === "parent") router.replace("/(tabs)/children");
      else if (userRole === "school_admin") router.replace("/(tabs)/profile");
      else router.replace("/(tabs)/competitions");
    }
  }, [userRole]);

  if (userRole && userRole !== "teacher") return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Teacher Dashboard</Text>
          <Text style={styles.subtitle}>Your students and their competition activity</Text>
        </View>

        {/* Summary cards */}
        {loadingSummary ? (
          <ActivityIndicator style={styles.loader} color={Brand.primary} />
        ) : (
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{summary?.totalStudents ?? 0}</Text>
              <Text style={styles.cardLabel}>My Students</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{summary?.totalRegistrations ?? 0}</Text>
              <Text style={styles.cardLabel}>Registrations</Text>
            </View>
            <View style={styles.card}>
              <Text style={[styles.cardValue, { color: "#059669" }]}>{summary?.confirmedRegistrations ?? 0}</Text>
              <Text style={styles.cardLabel}>Confirmed</Text>
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/(tabs)/teacher-students")}>
              <Text style={styles.actionBtnEmoji}>👥</Text>
              <Text style={styles.actionBtnText}>My Students</Text>
              <Text style={styles.actionBtnSub}>View & manage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/(tabs)/teacher-analytics")}>
              <Text style={styles.actionBtnEmoji}>🏆</Text>
              <Text style={styles.actionBtnText}>Competitions</Text>
              <Text style={styles.actionBtnSub}>My students registered</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming deadlines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
          {loadingDeadlines ? (
            <ActivityIndicator color={Brand.primary} />
          ) : deadlines && deadlines.length > 0 ? (
            deadlines.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.deadlineRow}>
                <View style={styles.deadlineLeft}>
                  <Text style={styles.deadlineName} numberOfLines={1}>{item.competition}</Text>
                  <Text style={styles.deadlineDate}>{item.deadline}</Text>
                </View>
                <View style={[styles.deadlineBadge, { backgroundColor: item.status === "urgent" ? "#FEE2E2" : "#DBEAFE" }]}>
                  <Text style={[styles.deadlineBadgeText, { color: item.status === "urgent" ? "#EF4444" : "#3B82F6" }]}>
                    {item.daysLeft}d left
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No upcoming deadlines in the next 30 days</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scroll:    { padding: 20, paddingBottom: 40 },
  header:    { marginBottom: 24 },
  title:     { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  subtitle:  { marginTop: 4, fontSize: 14, color: "#64748B" },
  loader:    { marginVertical: 32 },
  grid:      { flexDirection: "row", gap: 12, marginBottom: 28 },
  card: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16,
    padding: 16, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardValue: { fontSize: 28, fontWeight: "800", color: Brand.primary },
  cardLabel: { marginTop: 4, fontSize: 12, color: "#64748B", textAlign: "center" },
  section:   { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  actionBtnEmoji: { fontSize: 28, marginBottom: 8 },
  actionBtnText:  { fontSize: 14, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  actionBtnSub:   { marginTop: 4, fontSize: 11, color: "#64748B", textAlign: "center" },
  deadlineRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
  },
  deadlineLeft: { flex: 1, marginRight: 12 },
  deadlineName: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  deadlineDate: { marginTop: 2, fontSize: 12, color: "#64748B" },
  deadlineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  deadlineBadgeText: { fontSize: 12, fontWeight: "700" },
  empty: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },
});
