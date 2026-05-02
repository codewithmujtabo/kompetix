import { Brand, CategoryAccent, CategoryBg, CategoryEmoji } from "@/constants/theme";
import { useUser, type Registration } from "@/context/AuthContext";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as favoritesService from "@/services/favorites.service";
import * as paymentsService from "@/services/payments.service";
import type { Favorite } from "@/services/favorites.service";

const TABS = ["Saved", "Applications", "Joined"] as const;
type TabType = (typeof TABS)[number];

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  registered: { label: "Payment Needed", bg: "#FEF3C7", color: "#92400E" },
  pending_review: { label: "Under Review", bg: "#DBEAFE", color: "#1D4ED8" },
  approved: { label: "Approved", bg: "#D1FAE5", color: "#065F46" },
  rejected: { label: "Needs Fix", bg: "#FEE2E2", color: "#B91C1C" },
  paid: { label: "Joined", bg: "#D1FAE5", color: "#065F46" },
  completed: { label: "Completed", bg: "#E0E7FF", color: "#4338CA" },
};

function formatCurrency(amount: number) {
  return amount === 0 ? "Free" : `Rp ${amount.toLocaleString("id-ID")}`;
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CFG[status] || {
    label: status,
    bg: "#E2E8F0",
    color: "#475569",
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function EmptyState({
  emoji,
  title,
  body,
  actionLabel,
  onAction,
}: {
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.primaryButton} onPress={onAction}>
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function MyCompetitionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { registrations, registerCompetition, refreshRegistrations } = useUser();

  const [activeTab, setActiveTab] = useState<TabType>("Applications");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyCompId, setBusyCompId] = useState<string | null>(null);
  const [busyRegistrationId, setBusyRegistrationId] = useState<string | null>(null);
  const refreshRegistrationsRef = useRef(refreshRegistrations);
  const loadFavoritesRef = useRef<() => Promise<void>>(async () => {});

  const loadFavorites = useCallback(async () => {
    setLoadingFavorites(true);
    try {
      const data = await favoritesService.list();
      setFavorites(data);
    } catch (err) {
      console.error("Failed to load favorites:", err);
    } finally {
      setLoadingFavorites(false);
    }
  }, []);

  useEffect(() => {
    refreshRegistrationsRef.current = refreshRegistrations;
  }, [refreshRegistrations]);

  useEffect(() => {
    loadFavoritesRef.current = loadFavorites;
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      void refreshRegistrationsRef.current();
      void loadFavoritesRef.current();
    }, [])
  );

  const registeredCompetitionIds = useMemo(
    () => new Set(registrations.map((registration) => registration.compId)),
    [registrations]
  );

  const savedItems = useMemo(
    () => favorites.filter((favorite) => !registeredCompetitionIds.has(favorite.id)),
    [favorites, registeredCompetitionIds]
  );

  const applications = useMemo(
    () =>
      registrations.filter((registration) =>
        ["registered", "pending_review", "rejected"].includes(registration.status)
      ),
    [registrations]
  );

  const joinedItems = useMemo(
    () =>
      registrations.filter((registration) =>
        ["approved", "paid", "completed"].includes(registration.status)
      ),
    [registrations]
  );

  const tabCounts = {
    Saved: savedItems.length,
    Applications: applications.length,
    Joined: joinedItems.length,
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshRegistrations(), loadFavorites()]);
    setRefreshing(false);
  };

  const handleRemoveFavorite = async (favorite: Favorite) => {
    try {
      setBusyCompId(favorite.id);
      await favoritesService.remove(favorite.id);
      setFavorites((current) => current.filter((item) => item.id !== favorite.id));
    } catch {
      Alert.alert("Error", "Failed to remove this competition from saved list.");
    } finally {
      setBusyCompId(null);
    }
  };

  const pickAndUploadProof = async (registrationId: string) => {
    try {
      setBusyRegistrationId(registrationId);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Needed", "Photo library permission is required to upload your screenshot.");
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }

      const asset = picked.assets[0];
      const manualIntent = await paymentsService.createManualIntent(registrationId);
      await paymentsService.uploadPaymentProof(manualIntent.paymentId, {
        uri: asset.uri,
        name: asset.fileName || `payment-proof-${Date.now()}.jpg`,
        mimeType: asset.mimeType,
      });
      await refreshRegistrations();
      setActiveTab("Applications");
      Alert.alert(
        "Proof Submitted",
        "Your application is now under review by admin."
      );
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message || "Failed to upload payment proof.");
    } finally {
      setBusyRegistrationId(null);
    }
  };

  const handleApplyFromSaved = async (favorite: Favorite) => {
    try {
      setBusyCompId(favorite.id);
      const registration = await registerCompetition(favorite.id, {
        competitionName: favorite.name,
        fee: favorite.fee,
        category: favorite.category,
      });
      await favoritesService.remove(favorite.id).catch(() => undefined);
      setFavorites((current) => current.filter((item) => item.id !== favorite.id));

      if (favorite.fee > 0) {
        Alert.alert(
          "Application Created",
          "Your application was created. Continue to Midtrans payment now, then upload your screenshot from the application tab.",
          [
            {
              text: "Later",
              onPress: () => setActiveTab("Applications"),
            },
            {
              text: "Pay Now",
              onPress: () =>
                router.push({
                  pathname: "/(payment)/pay",
                  params: { registrationId: registration.id },
                }),
            },
          ]
        );
      } else {
        setActiveTab("Joined");
        Alert.alert(
          "Registered",
          "This competition is free, so you were added directly to your joined competitions."
        );
      }
    } catch (err: any) {
      Alert.alert("Application Failed", err.message || "Unable to apply for this competition.");
    } finally {
      setBusyCompId(null);
    }
  };

  const renderSavedCard = ({ item }: { item: Favorite }) => {
    const accent = CategoryAccent[item.category ?? ""] ?? Brand.primary;
    const bg = CategoryBg[item.category ?? ""] ?? "#EEF2FF";
    const emoji = CategoryEmoji[item.category ?? ""] ?? "🏆";

    return (
      <View style={[styles.card, { borderLeftColor: accent }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: bg }]}>
            <Text style={styles.iconEmoji}>{emoji}</Text>
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.organizer_name} • {item.category}
            </Text>
            <Text style={styles.cardPrice}>{formatCurrency(item.fee)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => handleRemoveFavorite(item)}
            disabled={busyCompId === item.id}
          >
            <Text style={styles.secondaryButtonText}>
              {busyCompId === item.id ? "Removing..." : "Remove"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.primaryButtonInline}
            onPress={() => handleApplyFromSaved(item)}
            disabled={busyCompId === item.id}
          >
            <Text style={styles.primaryButtonText}>
              {busyCompId === item.id ? "Applying..." : "Apply"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderApplicationCard = ({ item }: { item: Registration }) => {
    const category = item.meta?.category as string | undefined;
    const accent = CategoryAccent[category ?? ""] ?? Brand.primary;
    const bg = CategoryBg[category ?? ""] ?? "#EEF2FF";
    const emoji = CategoryEmoji[category ?? ""] ?? "📝";

    return (
      <View style={[styles.card, { borderLeftColor: accent }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: bg }]}>
            <Text style={styles.iconEmoji}>{emoji}</Text>
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle}>{item.competitionName}</Text>
            <Text style={styles.cardMeta}>{formatCurrency(item.fee)}</Text>
            <StatusBadge status={item.status} />
            {item.status === "pending_review" ? (
              <Text style={styles.helperText}>
                Admin is reviewing your proof. You will get a notification after approval.
              </Text>
            ) : null}
            {item.status === "rejected" ? (
              <Text style={styles.helperText}>
                Your previous proof was rejected. Upload a corrected proof to continue.
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actionRow}>
          {item.fee > 0 && ["registered", "rejected"].includes(item.status) ? (
            <>
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  router.push({
                    pathname: "/(payment)/pay",
                    params: { registrationId: item.id },
                  })
                }
              >
                <Text style={styles.secondaryButtonText}>Pay Now</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButtonInline}
                onPress={() => pickAndUploadProof(item.id)}
                disabled={busyRegistrationId === item.id}
              >
                <Text style={styles.primaryButtonText}>
                  {busyRegistrationId === item.id
                    ? "Uploading..."
                    : item.status === "rejected"
                    ? "Upload New Proof"
                    : "Upload Screenshot"}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/competitions/[id]",
                  params: { id: item.compId },
                })
              }
            >
              <Text style={styles.secondaryButtonText}>View Competition</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderJoinedCard = ({ item }: { item: Registration }) => {
    const category = item.meta?.category as string | undefined;
    const accent = CategoryAccent[category ?? ""] ?? Brand.primary;
    const bg = CategoryBg[category ?? ""] ?? "#EEF2FF";
    const emoji = CategoryEmoji[category ?? ""] ?? "🏅";

    return (
      <View style={[styles.card, { borderLeftColor: accent }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: bg }]}>
            <Text style={styles.iconEmoji}>{emoji}</Text>
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle}>{item.competitionName}</Text>
            <Text style={styles.cardMeta}>{formatCurrency(item.fee)}</Text>
            <StatusBadge status={item.status} />
            <Text style={styles.helperText}>
              Open the competition hub to view schedule, platform, venue, and participant instructions.
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.primaryButtonInline}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/my-registration-details",
              params: { id: item.id },
            })
          }
        >
          <Text style={styles.primaryButtonText}>Open Competition Hub</Text>
        </Pressable>
      </View>
    );
  };

  const currentData =
    activeTab === "Saved" ? savedItems : activeTab === "Applications" ? applications : joinedItems;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: 24 },
      ]}
    >
      <Text style={styles.title}>My Competitions</Text>
      <Text style={styles.subtitle}>
        Saved competitions, applications in review, and competitions you already joined.
      </Text>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
            >
              {tab}
            </Text>
            {tabCounts[tab] > 0 ? (
              <View style={styles.tabCount}>
                <Text style={styles.tabCountText}>{tabCounts[tab]}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {activeTab === "Saved" && loadingFavorites ? (
        <EmptyState
          emoji="⏳"
          title="Loading saved competitions"
          body="Pull again in a moment if this takes too long."
        />
      ) : currentData.length === 0 ? (
        <EmptyState
          emoji={activeTab === "Saved" ? "💙" : activeTab === "Applications" ? "🧾" : "🏁"}
          title={
            activeTab === "Saved"
              ? "No saved competitions"
              : activeTab === "Applications"
              ? "No active applications"
              : "No joined competitions yet"
          }
          body={
            activeTab === "Saved"
              ? "Save competitions from the detail page, then apply when you are ready."
              : activeTab === "Applications"
              ? "Applications appear here after you apply and before admin approves them."
              : "Once your application is approved, the competition hub will appear here."
          }
          actionLabel={activeTab === "Saved" ? "Browse Competitions" : undefined}
          onAction={activeTab === "Saved" ? () => router.push("/(tabs)/competitions") : undefined}
        />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item: any) => item.favorite_id || item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Brand.primary}
            />
          }
          renderItem={
            activeTab === "Saved"
              ? (renderSavedCard as any)
              : activeTab === "Applications"
              ? (renderApplicationCard as any)
              : (renderJoinedCard as any)
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    color: "#64748B",
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 18,
    padding: 4,
    marginBottom: 18,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  tabText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 13,
  },
  tabTextActive: {
    color: Brand.primary,
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  tabCountText: {
    color: Brand.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 26,
  },
  cardMain: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardMeta: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 13,
  },
  cardPrice: {
    marginTop: 8,
    color: "#111827",
    fontWeight: "700",
    fontSize: 14,
  },
  helperText: {
    marginTop: 10,
    color: "#64748B",
    lineHeight: 20,
    fontSize: 13,
  },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  primaryButtonInline: {
    flex: 1,
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 52,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyBody: {
    textAlign: "center",
    color: "#64748B",
    lineHeight: 22,
  },
});
