import { Brand } from "@/constants/theme";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as adminService from "@/services/admin.service";

export default function AdminStudentsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const handlePhonePress = async (phone: string) => {
    const telUrl = `tel:${phone}`;
    const supported = await Linking.canOpenURL(telUrl);
    if (!supported) {
      return;
    }
    await Linking.openURL(telUrl);
  };

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["allStudents"],
    queryFn: () => adminService.getStudents(),
  });

  const filteredStudents = students.filter((student: any) =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.nisn?.includes(searchQuery)
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Students</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{filteredStudents.length} students</Text>
        </View>
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or NISN..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.full_name || "No name"}</Text>
                  <Text style={styles.studentEmail}>{item.email}</Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                {item.nisn && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="number" size={14} color="#94A3B8" />
                    <Text style={styles.detailLabel}>NISN:</Text>
                    <Text style={styles.detailValue}>{item.nisn}</Text>
                  </View>
                )}
                {item.school_name && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="building.2" size={14} color="#94A3B8" />
                    <Text style={styles.detailLabel}>School:</Text>
                    <Text style={styles.detailValue}>{item.school_name}</Text>
                  </View>
                )}
                {item.grade && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="graduationcap" size={14} color="#94A3B8" />
                    <Text style={styles.detailLabel}>Grade:</Text>
                    <Text style={styles.detailValue}>{item.grade}</Text>
                  </View>
                )}
                {item.phone && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="phone" size={14} color="#94A3B8" />
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Pressable onPress={() => handlePhonePress(item.phone)}>
                      <Text style={[styles.detailValue, { color: Brand.primary }]}>
                        {item.phone}
                      </Text>
                    </Pressable>
                  </View>
                )}
                {item.date_of_birth && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="calendar" size={14} color="#94A3B8" />
                    <Text style={styles.detailLabel}>DOB:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(item.date_of_birth).toLocaleDateString("id-ID")}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <IconSymbol name="clock" size={14} color="#94A3B8" />
                  <Text style={styles.detailLabel}>Joined:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                {typeof item.registration_count === "number" && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="checkmark.seal" size={14} color="#94A3B8" />
                    <Text style={styles.detailLabel}>Regs:</Text>
                    <Text style={styles.detailValue}>{item.registration_count}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  statsContainer: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statsText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  content: { flex: 1, paddingHorizontal: 16 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 12,
  },
  listContent: { paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  studentEmail: { fontSize: 13, color: "#64748B" },
  cardDetails: { gap: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 13, color: "#94A3B8", width: 70, fontWeight: "600" },
  detailValue: { fontSize: 13, color: "#475569", flex: 1 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: "#94A3B8" },
});
