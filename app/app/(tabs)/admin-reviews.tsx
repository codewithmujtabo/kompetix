import { Brand } from "@/constants/theme";
import { API_BASE_URL } from "@/config/api";
import * as adminService from "@/services/admin.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function PendingReviewCard({ item }: { item: adminService.PendingReview }) {
  const queryClient = useQueryClient();
  const appBaseUrl = API_BASE_URL || "";
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("Please upload a clearer or valid payment proof.");

  const approveMutation = useMutation({
    mutationFn: () => adminService.approveRegistration(item.registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingReviews"] });
    },
    onError: (error: any) => {
      Alert.alert("Approve Failed", error.message || "Could not approve registration.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminService.rejectRegistration(item.registrationId, reason),
    onSuccess: () => {
      setRejecting(false);
      queryClient.invalidateQueries({ queryKey: ["adminPendingReviews"] });
    },
    onError: (error: any) => {
      Alert.alert("Reject Failed", error.message || "Could not reject registration.");
    },
  });

  const proofUrl = item.payment.proofUrl?.startsWith("http")
    ? item.payment.proofUrl
    : item.payment.proofUrl
    ? `${appBaseUrl.replace(/\/api$/, "")}${item.payment.proofUrl}`
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.competition.name}</Text>
      <Text style={styles.cardSubTitle}>
        {item.student.name} • {item.student.school || "School not set"}
      </Text>
      <Text style={styles.cardMeta}>
        Fee: Rp {item.competition.fee.toLocaleString("id-ID")} • Paid: Rp{" "}
        {(item.payment.amount || item.competition.fee).toLocaleString("id-ID")}
      </Text>
      <Text style={styles.cardMeta}>
        Proof submitted:{" "}
        {item.payment.proofSubmittedAt
          ? new Date(item.payment.proofSubmittedAt).toLocaleString("id-ID")
          : "-"}
      </Text>

      {proofUrl ? (
        <Pressable style={styles.linkButton} onPress={() => Linking.openURL(proofUrl)}>
          <Text style={styles.linkButtonText}>Open Payment Proof</Text>
        </Pressable>
      ) : null}

      {rejecting ? (
        <View style={styles.rejectBox}>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason for rejection"
            placeholderTextColor="#94A3B8"
            multiline
          />
          <View style={styles.actionRow}>
            <Pressable style={styles.cancelButton} onPress={() => setRejecting(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.rejectButton}
              onPress={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
            >
              <Text style={styles.rejectButtonText}>
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Pressable
            style={styles.approveButton}
            onPress={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            <Text style={styles.approveButtonText}>
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Text>
          </Pressable>
          <Pressable style={styles.rejectButton} onPress={() => setRejecting(true)}>
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function AdminReviewsScreen() {
  const insets = useSafeAreaInsets();
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["adminPendingReviews"],
    queryFn: () => adminService.getPendingReviews(),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Reviews</Text>
        <Text style={styles.headerSubtitle}>{data.length} waiting for approval</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load pending reviews.</Text>
          <Pressable style={styles.approveButton} onPress={() => refetch()}>
            <Text style={styles.approveButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing waiting right now</Text>
          <Text style={styles.emptyText}>
            Student payment proofs will appear here after they upload them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.registrationId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <PendingReviewCard item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    marginTop: 4,
    color: "#64748B",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSubTitle: {
    marginTop: 6,
    color: "#475569",
    fontWeight: "600",
  },
  cardMeta: {
    marginTop: 6,
    color: "#64748B",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#065F46",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#B91C1C",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelButtonText: {
    color: "#334155",
    fontWeight: "800",
  },
  linkButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  linkButtonText: {
    color: Brand.primary,
    fontWeight: "800",
  },
  rejectBox: {
    marginTop: 14,
  },
  reasonInput: {
    minHeight: 96,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#0F172A",
    textAlignVertical: "top",
  },
  errorText: {
    color: "#0F172A",
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
});
