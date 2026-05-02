import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Brand } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { apiRequest } from "@/services/api";

interface School {
  id: string;
  npsn: string;
  name: string;
  address: string;
  city: string;
  province: string;
  studentCount: number;
}

interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  grade: number;
  nisn: string;
  registrationCount: number;
}

interface Registration {
  registrationId: string;
  status: string;
  registeredAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    grade: number;
  };
  competition: {
    id: string;
    name: string;
    category: string;
    level: string;
    startDate: string;
  };
}

export default function SchoolDashboardScreen() {
  const [activeTab, setActiveTab] = useState<"students" | "registrations" | "analytics">("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");

  // Fetch school details
  const { data: school, isLoading: schoolLoading } = useQuery<School>({
    queryKey: ["mySchool"],
    queryFn: () => apiRequest("/schools/my-school"),
  });

  // Fetch students
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["schoolStudents", searchQuery, gradeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (gradeFilter) params.append("grade", gradeFilter);
      return apiRequest(`/schools/students?${params.toString()}`);
    },
  });

  // Fetch registrations
  const { data: registrationsData, isLoading: registrationsLoading } = useQuery({
    queryKey: ["schoolRegistrations"],
    queryFn: () => apiRequest("/schools/registrations"),
  });

  const handleExportCSV = async () => {
    try {
      const token = await import("@/services/token.service").then((m) => m.getToken());
      const url = `${process.env.EXPO_PUBLIC_API_URL}/schools/export/csv`;

      Alert.alert(
        "Export CSV",
        "CSV export will download the student list. Open this link in your browser to download.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open",
            onPress: () => {
              // In a real app, you would open the browser or handle download
              console.log("Export URL:", url);
              Alert.alert("Info", "Export functionality requires browser access");
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to export CSV");
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = await import("@/services/token.service").then((m) => m.getToken());
      const url = `${process.env.EXPO_PUBLIC_API_URL}/schools/export/registrations/pdf`;

      Alert.alert(
        "Export PDF",
        "PDF export will download the registration report. Open this link in your browser to download.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open",
            onPress: () => {
              console.log("Export URL:", url);
              Alert.alert("Info", "Export functionality requires browser access");
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to export PDF");
    }
  };

  const renderStudentsTab = () => {
    const students = studentsData?.students || [];

    return (
      <View>
        {/* Search and Filters */}
        <View style={styles.filterSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.gradeFilters}>
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
          </View>
        </View>

        {/* Students List */}
        {studentsLoading ? (
          <ActivityIndicator style={styles.loader} color={Brand.primary} />
        ) : students.length === 0 ? (
          <Text style={styles.emptyText}>No students found</Text>
        ) : (
          students.map((student: Student) => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.fullName}</Text>
                <Text style={styles.studentDetails}>
                  Grade {student.grade} • {student.email}
                </Text>
                {student.nisn && (
                  <Text style={styles.studentNisn}>NISN: {student.nisn}</Text>
                )}
              </View>
              <View style={styles.studentBadge}>
                <Text style={styles.badgeText}>{student.registrationCount}</Text>
                <Text style={styles.badgeLabel}>Regs</Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderRegistrationsTab = () => {
    const registrations = registrationsData?.registrations || [];

    return (
      <View>
        {registrationsLoading ? (
          <ActivityIndicator style={styles.loader} color={Brand.primary} />
        ) : registrations.length === 0 ? (
          <Text style={styles.emptyText}>No registrations found</Text>
        ) : (
          registrations.map((reg: Registration) => (
            <View key={reg.registrationId} style={styles.regCard}>
              <View style={styles.regInfo}>
                <Text style={styles.regStudent}>{reg.student.name}</Text>
                <Text style={styles.regComp}>{reg.competition.name}</Text>
                <Text style={styles.regDetails}>
                  {reg.competition.category} • {reg.competition.level} • Grade{" "}
                  {reg.student.grade}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: reg.status === "paid" ? "#10B981" : "#F59E0B" },
                ]}
              >
                <Text style={styles.statusText}>{reg.status}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderAnalyticsTab = () => {
    const totalStudents = school?.studentCount || 0;
    const totalRegistrations = registrationsData?.pagination?.total || 0;

    return (
      <View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalRegistrations}</Text>
            <Text style={styles.statLabel}>Registrations</Text>
          </View>
        </View>

        <Text style={styles.comingSoon}>
          Advanced analytics coming soon...
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={Brand.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>School Dashboard</Text>
          <TouchableOpacity onPress={handleExportCSV} style={styles.exportButton}>
            <IconSymbol name="arrow.down.doc" size={20} color={Brand.primary} />
          </TouchableOpacity>
        </View>

        {/* School Info */}
        {schoolLoading ? (
          <ActivityIndicator style={styles.loader} color={Brand.primary} />
        ) : school ? (
          <View style={styles.schoolCard}>
            <Text style={styles.schoolName}>{school.name}</Text>
            <Text style={styles.schoolNpsn}>NPSN: {school.npsn}</Text>
            {school.city && (
              <Text style={styles.schoolLocation}>
                {school.city}, {school.province}
              </Text>
            )}
          </View>
        ) : null}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "students" && styles.tabActive]}
            onPress={() => setActiveTab("students")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "students" && styles.tabTextActive,
              ]}
            >
              Students
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "registrations" && styles.tabActive]}
            onPress={() => setActiveTab("registrations")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "registrations" && styles.tabTextActive,
              ]}
            >
              Registrations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "analytics" && styles.tabActive]}
            onPress={() => setActiveTab("analytics")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "analytics" && styles.tabTextActive,
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === "students" && renderStudentsTab()}
          {activeTab === "registrations" && renderRegistrationsTab()}
          {activeTab === "analytics" && renderAnalyticsTab()}
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginVertical: 20,
  },
  schoolCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  schoolNpsn: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 2,
  },
  schoolLocation: {
    fontSize: 14,
    color: "#94A3B8",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Brand.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#fff",
  },
  tabContent: {
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 12,
  },
  gradeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  gradeChipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  gradeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  gradeChipTextActive: {
    color: "#fff",
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
  studentNisn: {
    fontSize: 12,
    color: "#94A3B8",
  },
  studentBadge: {
    backgroundColor: "#F0F0FF",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    minWidth: 50,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.primary,
  },
  badgeLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  regCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  regInfo: {
    flex: 1,
  },
  regStudent: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  regComp: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 2,
  },
  regDetails: {
    fontSize: 12,
    color: "#94A3B8",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "uppercase",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: Brand.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  comingSoon: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 20,
  },
});
