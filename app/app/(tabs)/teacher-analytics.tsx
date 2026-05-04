import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Brand } from "@/constants/theme";
import {
  getRegistrationsByMonth,
  getCategoryDistribution,
  getGradeParticipation,
  getSuccessRate,
  getKeyMetrics,
} from "@/services/teachers.service";


export default function TeacherAnalyticsScreen() {
  const router = useRouter();

  // Fetch data from backend
  const { data: registrationsByMonth, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ["registrationsByMonth"],
    queryFn: getRegistrationsByMonth,
  });

  const { data: competitionCategories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categoryDistribution"],
    queryFn: getCategoryDistribution,
  });

  const { data: gradeParticipation, isLoading: isLoadingGrades } = useQuery({
    queryKey: ["gradeParticipation"],
    queryFn: getGradeParticipation,
  });

  const { data: successRate, isLoading: isLoadingSuccess } = useQuery({
    queryKey: ["successRate"],
    queryFn: getSuccessRate,
  });

  const { data: keyMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["keyMetrics"],
    queryFn: getKeyMetrics,
  });

  const isLoading =
    isLoadingMonthly || isLoadingCategories || isLoadingGrades || isLoadingSuccess || isLoadingMetrics;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Brand.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Track student participation and performance trends
          </Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{keyMetrics?.totalRegistrations || 0}</Text>
            <Text style={styles.metricLabel}>Total Registrations</Text>
            <Text style={[styles.metricChange, keyMetrics && keyMetrics.percentChange < 0 && styles.metricChangeNegative]}>
              {keyMetrics && keyMetrics.percentChange >= 0 ? "+" : ""}
              {keyMetrics?.percentChange || 0}% from last month
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{keyMetrics?.activeStudents || 0}</Text>
            <Text style={styles.metricLabel}>Active Students</Text>
            <Text style={styles.metricChange}>Last 30 days</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{keyMetrics?.averagePerStudent || "0.0"}</Text>
            <Text style={styles.metricLabel}>Avg per Student</Text>
            <Text style={styles.metricChange}>Last 30 days</Text>
          </View>
        </View>

        {/* Registrations Trend */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Registrations by Month</Text>
          <Text style={styles.chartSubtitle}>Track participation trends over time</Text>

          {registrationsByMonth && registrationsByMonth.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", paddingBottom: 24, gap: 8 }}>
                {registrationsByMonth.map((item: { month: string; count: number }) => {
                  const maxVal = Math.max(...registrationsByMonth.map((r: { count: number }) => r.count), 1);
                  const barHeight = Math.max((item.count / maxVal) * 160, 4);
                  return (
                    <View key={item.month} style={{ alignItems: "center", width: 40 }}>
                      <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>{item.count}</Text>
                      <View style={{ width: 32, height: barHeight, backgroundColor: Brand.primary, borderRadius: 4 }} />
                      <Text style={{ fontSize: 9, color: "#94A3B8", marginTop: 4 }}>{item.month}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          )}
        </View>

        {/* Competition Categories */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Competition Categories</Text>
          <Text style={styles.chartSubtitle}>Distribution by category type</Text>

          {competitionCategories && competitionCategories.length > 0 ? (
            <View style={{ gap: 8 }}>
              {competitionCategories.map((item: { category: string; count: number; color: string }) => {
                const total = competitionCategories.reduce((s: number, c: { count: number }) => s + c.count, 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <View key={item.category} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
                    <Text style={{ flex: 1, fontSize: 13, color: "#334155" }}>{item.category}</Text>
                    <View style={{ flex: 2, height: 12, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
                      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: item.color, borderRadius: 6 }} />
                    </View>
                    <Text style={{ width: 36, fontSize: 12, color: "#64748B", textAlign: "right" }}>{item.count}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No category data available</Text>
            </View>
          )}
        </View>

        {/* Grade Participation */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Participation by Grade</Text>
          <Text style={styles.chartSubtitle}>Which grades are most active</Text>

          {gradeParticipation && gradeParticipation.length > 0 ? (
            gradeParticipation.map((item: { grade: string; count: number }, index: number) => {
              const maxCount = Math.max(...gradeParticipation.map((g) => g.count));
              return (
                <View key={item.grade} style={styles.progressRow}>
                  <Text style={styles.progressLabel}>{item.grade}</Text>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : "0%",
                          backgroundColor:
                            index === 0
                              ? "#4F46E5"
                              : index === 1
                              ? "#10B981"
                              : "#F59E0B",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressValue}>{item.count}</Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No grade participation data</Text>
            </View>
          )}
        </View>

        {/* Success Rate */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Registration Success Rate</Text>
          <Text style={styles.chartSubtitle}>From submission to confirmed</Text>

          <View style={styles.successMetrics}>
            <View style={styles.successItem}>
              <View style={[styles.successDot, { backgroundColor: "#10B981" }]} />
              <View style={styles.successInfo}>
                <Text style={styles.successLabel}>Confirmed</Text>
                <Text style={styles.successValue}>{successRate?.confirmed || 0}%</Text>
              </View>
            </View>
            <View style={styles.successItem}>
              <View style={[styles.successDot, { backgroundColor: "#F59E0B" }]} />
              <View style={styles.successInfo}>
                <Text style={styles.successLabel}>Pending</Text>
                <Text style={styles.successValue}>{successRate?.pending || 0}%</Text>
              </View>
            </View>
            <View style={styles.successItem}>
              <View style={[styles.successDot, { backgroundColor: "#EF4444" }]} />
              <View style={styles.successInfo}>
                <Text style={styles.successLabel}>Rejected</Text>
                <Text style={styles.successValue}>{successRate?.rejected || 0}%</Text>
              </View>
            </View>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
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
    marginBottom: 20,
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
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Brand.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  metricChange: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
  },
  metricChangeNegative: {
    color: "#EF4444",
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
  },
  pieContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    color: "#64748B",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressLabel: {
    width: 80,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
  progressBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 12,
  },
  progressBar: {
    height: "100%",
    borderRadius: 12,
  },
  progressValue: {
    width: 30,
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
  },
  successMetrics: {
    gap: 16,
  },
  successItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  successDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  successInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  successLabel: {
    fontSize: 15,
    color: "#64748B",
  },
  successValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  emptyChart: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
  },
});
