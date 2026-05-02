import { IconSymbol } from "@/components/ui/icon-symbol";
import { Brand } from "@/constants/theme";
import * as registrationsService from "@/services/registrations.service";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatDate(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyRegistrationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["registrationDetail", id],
    queryFn: () => registrationsService.getDetail(id!),
    enabled: !!id,
  });

  const registration = data;
  const competition = data?.competition;

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (isError || !registration || !competition) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Failed to load competition hub</Text>
        <Pressable style={styles.primaryButton} onPress={() => refetch()}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(tabs)/my-competitions")}>
          <IconSymbol name="chevron.left" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Competition Hub
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{competition.name}</Text>
          <Text style={styles.heroMeta}>
            {competition.organizerName} • {competition.category}
          </Text>
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedBadgeText}>
              {registration.status === "completed" ? "Completed" : "Approved / Joined"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What You Need To Know</Text>
          <Text style={styles.sectionBody}>
            {competition.participantInstructions?.trim() ||
              "Admin has not published detailed participant instructions yet. Check back later or watch notifications."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Competition Date</Text>
            <Text style={styles.infoValue}>{formatDate(competition.competitionDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registration Closed</Text>
            <Text style={styles.infoValue}>{formatDate(competition.regCloseDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Website</Text>
            <Text style={styles.infoValue}>
              {competition.websiteUrl?.trim() ? competition.websiteUrl : "-"}
            </Text>
          </View>
          {competition.websiteUrl?.trim() ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => Linking.openURL(competition.websiteUrl!)}
            >
              <Text style={styles.secondaryButtonText}>Open Website</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rounds & Schedule</Text>
          {competition.rounds.length > 0 ? (
            competition.rounds.map((round) => (
              <View key={round.id} style={styles.roundCard}>
                <Text style={styles.roundTitle}>
                  {round.roundOrder ? `Round ${round.roundOrder}` : round.roundName}
                </Text>
                <Text style={styles.roundMeta}>
                  {round.roundName} • {round.roundType}
                </Text>
                <Text style={styles.roundDetail}>Starts: {formatDate(round.startDate)}</Text>
                <Text style={styles.roundDetail}>Exam: {formatDate(round.examDate)}</Text>
                <Text style={styles.roundDetail}>
                  Location / Platform: {round.location?.trim() || "-"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.sectionBody}>
              Round-by-round schedule has not been published yet.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 20,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  heroMeta: {
    marginTop: 8,
    color: "#CBD5E1",
  },
  approvedBadge: {
    marginTop: 16,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  approvedBadgeText: {
    color: "#065F46",
    fontWeight: "800",
    fontSize: 12,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  sectionBody: {
    color: "#475569",
    lineHeight: 22,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoValue: {
    color: "#0F172A",
    fontWeight: "600",
    lineHeight: 20,
  },
  roundCard: {
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginTop: 10,
  },
  roundTitle: {
    fontWeight: "800",
    color: "#0F172A",
  },
  roundMeta: {
    marginTop: 4,
    color: Brand.primary,
    fontWeight: "700",
  },
  roundDetail: {
    marginTop: 6,
    color: "#475569",
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#EEF2FF",
  },
  secondaryButtonText: {
    color: Brand.primary,
    fontWeight: "800",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
});
