import { Brand } from "@/constants/theme";
import * as historicalService from "@/services/historical.service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "claimed" | "search";

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null;
  const isPassed = result === "PASSED";
  return (
    <View style={[styles.resultBadge, { backgroundColor: isPassed ? "#D1FAE5" : "#FEE2E2" }]}>
      <Text style={[styles.resultBadgeText, { color: isPassed ? "#065F46" : "#B91C1C" }]}>
        {isPassed ? "Passed" : "Failed"}
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("claimed");
  const [searchName, setSearchName] = useState("");
  const [searchSchool, setSearchSchool] = useState("");
  const [searchCompName, setSearchCompName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: claimed = [], isLoading: isLoadingClaimed, refetch: refetchClaimed } = useQuery({
    queryKey: ["historicalMyRecords"],
    queryFn: () => historicalService.getMyRecords(),
  });

  const {
    data: searchResults = [],
    isLoading: isSearching,
    refetch: runSearch,
  } = useQuery({
    queryKey: ["historicalSearch", searchName, searchSchool, searchCompName],
    queryFn: () =>
      historicalService.search({
        name: searchName.trim(),
        school: searchSchool.trim() || undefined,
        compName: searchCompName.trim() || undefined,
      }),
    enabled: false,
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => historicalService.claim(id),
    onSuccess: (_, id) => {
      Alert.alert("Claimed", "Record added to your competition history.");
      queryClient.invalidateQueries({ queryKey: ["historicalMyRecords"] });
      queryClient.invalidateQueries({ queryKey: ["historicalSearch"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to claim record.");
    },
  });

  const unclaimMutation = useMutation({
    mutationFn: (id: string) => historicalService.unclaim(id),
    onSuccess: () => {
      Alert.alert("Removed", "Record removed from your history.");
      refetchClaimed();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to remove record.");
    },
  });

  const handleSearch = () => {
    if (searchName.trim().length < 3) {
      Alert.alert("Too short", "Name must be at least 3 characters.");
      return;
    }
    setHasSearched(true);
    runSearch();
  };

  const handleUnclaim = (id: string, compName: string | null) => {
    Alert.alert(
      "Remove Record",
      `Remove "${compName ?? "this record"}" from your history?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => unclaimMutation.mutate(id) },
      ]
    );
  };

  const claimedIds = new Set(claimed.map((r) => r.id));

  const renderClaimedCard = ({ item }: { item: historicalService.ClaimedRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.compName}>{item.compName ?? "Unknown Competition"}</Text>
          <Text style={styles.compMeta}>
            {[item.compYear, item.compCategory, item.eventPart].filter(Boolean).join(" · ")}
          </Text>
          {item.schoolName ? (
            <Text style={styles.schoolName}>{item.schoolName}</Text>
          ) : null}
        </View>
        <ResultBadge result={item.result} />
      </View>
      <Pressable
        style={styles.removeButton}
        onPress={() => handleUnclaim(item.id, item.compName)}
        disabled={unclaimMutation.isPending}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </Pressable>
    </View>
  );

  const renderSearchCard = ({ item }: { item: historicalService.HistoricalRecord }) => {
    const alreadyClaimed = claimedIds.has(item.id);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.participantName}>{item.fullName}</Text>
            <Text style={styles.compName}>{item.compName ?? "Unknown Competition"}</Text>
            <Text style={styles.compMeta}>
              {[item.compYear, item.compCategory, item.eventPart].filter(Boolean).join(" · ")}
            </Text>
            {item.schoolName ? (
              <Text style={styles.schoolName}>{item.schoolName}</Text>
            ) : null}
          </View>
          <ResultBadge result={item.result} />
        </View>
        {alreadyClaimed ? (
          <View style={styles.claimedTag}>
            <Text style={styles.claimedTagText}>In Your History</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.claimButton, claimMutation.isPending && { opacity: 0.6 }]}
            onPress={() => claimMutation.mutate(item.id)}
            disabled={claimMutation.isPending}
          >
            <Text style={styles.claimButtonText}>Add to My History</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Competition History</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, tab === "claimed" && styles.tabButtonActive]}
          onPress={() => setTab("claimed")}
        >
          <Text style={[styles.tabText, tab === "claimed" && styles.tabTextActive]}>
            My Records {claimed.length > 0 ? `(${claimed.length})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === "search" && styles.tabButtonActive]}
          onPress={() => setTab("search")}
        >
          <Text style={[styles.tabText, tab === "search" && styles.tabTextActive]}>
            Find & Claim
          </Text>
        </Pressable>
      </View>

      {tab === "claimed" ? (
        isLoadingClaimed ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Brand.primary} />
        ) : claimed.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>No historical records yet</Text>
            <Text style={styles.emptyBody}>
              Your past Eduversal competition records will appear here after auto-linking, or
              you can search and claim them in the "Find & Claim" tab.
            </Text>
          </View>
        ) : (
          <FlatList
            data={claimed}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={renderClaimedCard}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.searchHint}>
            Search your name as it appeared in Eduversal competitions to find and claim records.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Your name (min 3 chars)"
            placeholderTextColor="#94A3B8"
            value={searchName}
            onChangeText={setSearchName}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TextInput
            style={styles.input}
            placeholder="School name (optional)"
            placeholderTextColor="#94A3B8"
            value={searchSchool}
            onChangeText={setSearchSchool}
          />
          <TextInput
            style={styles.input}
            placeholder="Competition name e.g. EMC (optional)"
            placeholderTextColor="#94A3B8"
            value={searchCompName}
            onChangeText={setSearchCompName}
          />

          <Pressable
            style={[styles.searchButton, isSearching && { opacity: 0.6 }]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            <Text style={styles.searchButtonText}>
              {isSearching ? "Searching..." : "Search"}
            </Text>
          </Pressable>

          {hasSearched && !isSearching && searchResults.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptyBody}>
                Try a different name spelling or leave school/competition blank.
              </Text>
            </View>
          )}

          {searchResults.map((item) => (
            <View key={item.id}>{renderSearchCard({ item })}</View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backArrow: { fontSize: 28, color: "#0F172A", lineHeight: 32 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: Brand.primary,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: Brand.primary },
  listContent: { padding: 16, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardInfo: { flex: 1, marginRight: 8 },
  participantName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  compName: { fontSize: 14, fontWeight: "600", color: "#1E40AF", marginTop: 2 },
  compMeta: { fontSize: 12, color: "#64748B", marginTop: 3 },
  schoolName: { fontSize: 12, color: "#475569", marginTop: 2 },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  resultBadgeText: { fontSize: 11, fontWeight: "700" },
  removeButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  removeButtonText: { color: "#B91C1C", fontWeight: "700", fontSize: 13 },
  claimButton: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  claimButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  claimedTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
  },
  claimedTagText: { color: "#065F46", fontWeight: "700", fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 42, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  emptyBody: { textAlign: "center", color: "#64748B", lineHeight: 22 },
  searchHint: {
    color: "#475569",
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 10,
  },
  searchButton: {
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  searchButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
