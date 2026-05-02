import { Brand } from "@/constants/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as adminService from "@/services/admin.service";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export default function AdminCompetitionRegistrationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [exporting, setExporting] = useState(false);

  const goBackToAdminCompetitions = () => {
    router.replace("/(tabs)/admin-competitions");
  };

  const handlePhonePress = async (phone: string) => {
    const telUrl = `tel:${phone}`;
    const supported = await Linking.canOpenURL(telUrl);
    if (!supported) {
      return;
    }
    await Linking.openURL(telUrl);
  };

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["competitionRegistrations", id],
    queryFn: () => adminService.getCompetitionRegistrations(id),
  });

  const handleExportCSV = async () => {
    try {
      setExporting(true);

      // Get CSV blob from API
      const blob = await adminService.exportRegistrationsCSV(id);

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64 = base64data.split(',')[1];

        // Save to device
        const filename = `registrations-${id}-${Date.now()}.csv`;
        const fileUri = FileSystem.documentDirectory + filename;

        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Share file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Success", `CSV saved to ${fileUri}`);
        }
      };
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

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
        <Pressable onPress={goBackToAdminCompetitions}>
          <IconSymbol name="chevron.left" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Registrations
        </Text>
        <Pressable onPress={handleExportCSV} disabled={exporting || registrations.length === 0}>
          {exporting ? (
            <ActivityIndicator size="small" color={Brand.primary} />
          ) : (
            <IconSymbol
              name="arrow.down.doc"
              size={24}
              color={registrations.length === 0 ? "#CBD5E1" : Brand.primary}
            />
          )}
        </Pressable>
      </View>

      <View style={styles.compInfo}>
        <Text style={styles.compName} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.compStats}>
          {registrations.length} {registrations.length === 1 ? 'registration' : 'registrations'}
        </Text>
      </View>

      <FlatList
        data={registrations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No registrations yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.full_name}</Text>
                <Text style={styles.studentEmail}>{item.email}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === "paid"
                        ? "#D1FAE5"
                        : item.status === "registered"
                        ? "#FEF3C7"
                        : "#FEE2E2",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        item.status === "paid"
                          ? "#065F46"
                          : item.status === "registered"
                          ? "#92400E"
                          : "#991B1B",
                    },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.cardDetails}>
              {item.nisn && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>NISN:</Text>
                  <Text style={styles.detailValue}>{item.nisn}</Text>
                </View>
              )}
              {item.school_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>School:</Text>
                  <Text style={styles.detailValue}>{item.school_name}</Text>
                </View>
              )}
              {item.grade && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Grade:</Text>
                  <Text style={styles.detailValue}>{item.grade}</Text>
                </View>
              )}
              {item.phone && (
                <View style={styles.detailRow}>
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
                  <Text style={styles.detailLabel}>DOB:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(item.date_of_birth).toLocaleDateString("id-ID")}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registered:</Text>
                <Text style={styles.detailValue}>
                  {new Date(item.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", flex: 1, marginHorizontal: 12 },
  compInfo: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  compName: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  compStats: { fontSize: 13, color: "#64748B" },
  listContent: { padding: 16, paddingBottom: 40 },
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  studentInfo: { flex: 1, marginRight: 12 },
  studentName: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  studentEmail: { fontSize: 13, color: "#64748B" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardDetails: { gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center" },
  detailLabel: { fontSize: 13, color: "#94A3B8", width: 90, fontWeight: "600" },
  detailValue: { fontSize: 13, color: "#475569", flex: 1 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: "#94A3B8" },
});
