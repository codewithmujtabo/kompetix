import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Brand } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";
import { useUser } from "@/context/AuthContext";
import { getTeacherStudents } from "@/services/teachers.service";

export default function TeacherStudentsScreen() {
  const { user } = useUser();
  const userRole = (user as any)?.role;
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  // Fetch students from backend (hooks must be called before any returns)
  const { data, isLoading } = useQuery({
    queryKey: ["teacherStudents", searchQuery, gradeFilter],
    queryFn: () => getTeacherStudents(searchQuery, gradeFilter),
    enabled: userRole === "teacher", // Only fetch if teacher
  });

  const students = data?.students || [];
  const stats = data?.stats || { totalStudents: 0, totalRegistrations: 0, activeStudents: 0 };

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

  const handleBulkRegister = () => {
    router.push("/bulk-registration");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Students</Text>
            <Text style={styles.headerSubtitle}>
              Manage your students and track their progress
            </Text>
          </View>
          <TouchableOpacity style={styles.bulkButton} onPress={handleBulkRegister}>
            <IconSymbol name="plus.circle.fill" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search & Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gradeFilters}
            contentContainerStyle={styles.gradeFiltersContent}
          >
            {[7, 8, 9, 10, 11, 12].map((grade) => (
              <TouchableOpacity
                key={grade}
                style={[
                  styles.gradeChip,
                  gradeFilter === String(grade) && styles.gradeChipActive,
                ]}
                onPress={() =>
                  setGradeFilter(gradeFilter === String(grade) ? "" : String(grade))
                }
              >
                <Text
                  style={[
                    styles.gradeChipText,
                    gradeFilter === String(grade) && styles.gradeChipTextActive,
                  ]}
                >
                  Grade {grade}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalRegistrations}</Text>
            <Text style={styles.statLabel}>Total Registrations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeStudents}</Text>
            <Text style={styles.statLabel}>Active Students</Text>
          </View>
        </View>

        {/* Students List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Students</Text>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={Brand.primary} />
          ) : students && students.length > 0 ? (
            students.map((student) => (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarText}>
                    {student.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.fullName}</Text>
                  <Text style={styles.studentDetails}>
                    {student.grade ? `Grade ${student.grade}` : "No grade"}{student.nisn ? ` • NISN: ${student.nisn}` : ""}
                  </Text>
                  <Text style={styles.studentEmail}>{student.email}</Text>
                </View>

                <View style={styles.studentStats}>
                  <View style={styles.regBadge}>
                    <Text style={styles.regBadgeText}>
                      {student.registrationCount}
                    </Text>
                    <Text style={styles.regBadgeLabel}>regs</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="person.3.fill" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || gradeFilter
                  ? "Try adjusting your filters"
                  : "Students will appear here once added"}
              </Text>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  bulkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  gradeFilters: {
    maxHeight: 50,
  },
  gradeFiltersContent: {
    gap: 8,
  },
  gradeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  gradeChipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  gradeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  gradeChipTextActive: {
    color: "#fff",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Brand.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  listSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  loader: {
    marginVertical: 40,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  studentDetails: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: "#94A3B8",
  },
  studentStats: {
    alignItems: "flex-end",
  },
  regBadge: {
    backgroundColor: "#F0F0FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  regBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.primary,
  },
  regBadgeLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
