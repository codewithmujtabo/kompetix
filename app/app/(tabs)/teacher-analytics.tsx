import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Brand, CategoryAccent, CategoryBg, CategoryEmoji } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { getMyCompetitions, type MyCompetition } from "@/services/teachers.service";

const STATUS_COLOR: Record<string, string> = {
  pending_approval: "#F59E0B",
  registered:       "#3B82F6",
  paid:             "#059669",
  approved:         "#059669",
  rejected:         "#EF4444",
  completed:        "#6366F1",
};

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Pending",
  registered:       "Payment Due",
  paid:             "Confirmed",
  approved:         "Confirmed",
  rejected:         "Rejected",
  completed:        "Completed",
};

function formatFee(fee: number) {
  return fee === 0 ? "Free" : `Rp ${fee.toLocaleString("id-ID")}`;
}

export default function TeacherCompetitionsScreen() {
  const { user } = useUser();
  const userRole = (user as any)?.role;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["teacherCompetitions"],
    queryFn: getMyCompetitions,
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

  const competitions = data?.competitions ?? [];

  const renderCompetition = ({ item }: { item: MyCompetition }) => {
    const accent = CategoryAccent[item.category ?? ""] ?? Brand.primary;
    const bg     = CategoryBg[item.category ?? ""] ?? "#EEF2FF";
    const emoji  = CategoryEmoji[item.category ?? ""] ?? "🏆";

    return (
      <View style={[styles.card, { borderLeftColor: accent }]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <Text style={styles.iconEmoji}>{emoji}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.compName}>{item.name}</Text>
            <Text style={styles.compFee}>{formatFee(item.fee)}</Text>
            {item.category ? <Text style={styles.compCategory}>{item.category}</Text> : null}
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{item.students.length}</Text>
            <Text style={styles.countLabel}>student{item.students.length !== 1 ? "s" : ""}</Text>
          </View>
        </View>

        <View style={styles.studentList}>
          {item.students.map((s) => (
            <View key={s.id} style={styles.studentRow}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>{s.fullName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.studentRowInfo}>
                <Text style={styles.studentRowName}>{s.fullName}</Text>
                {s.registrationNumber ? (
                  <Text style={styles.studentRegNum}>{s.registrationNumber}</Text>
                ) : null}
              </View>
              <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[s.status] ?? "#94A3B8") + "20" }]}>
                <Text style={[styles.statusPillText, { color: STATUS_COLOR[s.status] ?? "#94A3B8" }]}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Competitions</Text>
        <Text style={styles.subtitle}>Competitions your students are registered for</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Brand.primary} size="large" />
        </View>
      ) : competitions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🏅</Text>
          <Text style={styles.emptyTitle}>No registrations yet</Text>
          <Text style={styles.emptyBody}>
            Once your students register for competitions, they'll appear here grouped by competition.
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(tabs)/teacher-students")}>
            <Text style={styles.addBtnText}>Manage My Students</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={competitions}
          keyExtractor={(item) => item.id}
          renderItem={renderCompetition}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Brand.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header:    { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:     { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle:  { marginTop: 4, fontSize: 14, color: "#64748B", marginBottom: 8 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", textAlign: "center", marginBottom: 8 },
  emptyBody:  { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  addBtn:     { backgroundColor: Brand.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list:       { paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 },
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    borderLeftWidth: 4, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardTop:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  iconBox:   { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  iconEmoji: { fontSize: 22 },
  cardMeta:  { flex: 1 },
  compName:  { fontSize: 15, fontWeight: "800", color: "#0F172A", lineHeight: 20 },
  compFee:   { marginTop: 3, fontSize: 13, fontWeight: "600", color: "#475569" },
  compCategory: { marginTop: 3, fontSize: 12, color: "#94A3B8" },
  countBadge: { alignItems: "center", backgroundColor: "#EEF2FF", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  countText:  { fontSize: 20, fontWeight: "800", color: Brand.primary },
  countLabel: { fontSize: 10, color: Brand.primary, fontWeight: "600" },
  studentList: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 12, gap: 10 },
  studentRow:  { flexDirection: "row", alignItems: "center" },
  studentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Brand.primary + "15", alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  studentAvatarText: { fontSize: 14, fontWeight: "700", color: Brand.primary },
  studentRowInfo:    { flex: 1 },
  studentRowName:    { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  studentRegNum:     { fontSize: 11, color: "#64748B" },
  statusPill:        { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusPillText:    { fontSize: 11, fontWeight: "700" },
});
