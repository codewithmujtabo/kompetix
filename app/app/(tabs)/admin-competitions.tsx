import { Brand } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as adminService from "@/services/admin.service";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function AdminCompetitionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: competitions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminCompetitions"],
    queryFn: () => adminService.getCompetitions(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteCompetition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCompetitions"] });
      Alert.alert("Success", "Competition deleted successfully");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to delete competition");
    },
  });

  const filteredCompetitions = competitions.filter((comp: any) =>
    comp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete Competition",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Competitions</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/(tabs)/admin-competition-form")}
          >
            <IconSymbol name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add New</Text>
          </Pressable>
        </View>

        <View style={[styles.content, styles.center]}>
          <Text style={styles.errorTitle}>Failed to load competitions</Text>
          <Text style={styles.errorBody}>
            {(error as Error)?.message || "Please try again."}
          </Text>
          <Pressable style={styles.emptyButton} onPress={() => refetch()}>
            <Text style={styles.emptyButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Competitions</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/(tabs)/admin-competition-form")}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add New</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search competitions..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <FlatList
          data={filteredCompetitions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No competitions found</Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/(tabs)/admin-competition-form")}
              >
                <Text style={styles.emptyButtonText}>Create First Competition</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardOrg}>{item.organizer_name}</Text>
                  <View style={styles.cardMeta}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.registration_status === "On Going"
                              ? "#D1FAE5"
                              : item.registration_status === "Closed"
                              ? "#FEE2E2"
                              : "#FEF3C7",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              item.registration_status === "On Going"
                                ? "#065F46"
                                : item.registration_status === "Closed"
                                ? "#991B1B"
                                : "#92400E",
                          },
                        ]}
                      >
                        {item.registration_status}
                      </Text>
                    </View>
                    <Text style={styles.roundCount}>
                      {item.actual_round_count || item.round_count || 0} rounds
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/admin-competition-registrations",
                      params: { id: item.id, name: item.name },
                    })
                  }
                >
                  <IconSymbol name="person.3.fill" size={16} color={Brand.primary} />
                  <Text style={styles.actionText}>Registrations</Text>
                </Pressable>

                <Pressable
                  style={styles.actionButton}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/admin-competition-form",
                      params: { id: item.id },
                    })
                  }
                >
                  <IconSymbol name="pencil" size={16} color="#64748B" />
                  <Text style={[styles.actionText, { color: "#64748B" }]}>Edit</Text>
                </Pressable>

                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleDelete(item.id, item.name)}
                >
                  <IconSymbol name="trash" size={16} color="#EF4444" />
                  <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
                </Pressable>
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
  listContent: { paddingBottom: 20 },
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", lineHeight: 22 },
  cardOrg: { fontSize: 13, color: "#64748B", marginTop: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  roundCount: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  cardActions: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: { fontSize: 13, fontWeight: "600", color: Brand.primary },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, color: "#94A3B8", marginBottom: 16 },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  emptyButton: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
