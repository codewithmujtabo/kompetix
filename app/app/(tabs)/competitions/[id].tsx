import { IconSymbol } from "@/components/ui/icon-symbol";
import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import * as competitionsService from "@/services/competitions.service";
import * as favoritesService from "@/services/favorites.service";
import { Analytics } from "@/services/analytics";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatPrice(fee: number) {
  return fee === 0 ? "Free" : `Rp ${fee.toLocaleString("id-ID")}`;
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Math: "📐",
  Science: "🔬",
  Debate: "🎤",
  Arts: "🎨",
  Language: "📚",
  Technology: "🤖",
  Sports: "⚽",
};

export default function CompetitionDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, registrations, registerCompetition } = useUser();
  const [activeTab, setActiveTab] = useState<"overview" | "registration" | "payment">("overview");
  const viewStartTime = useRef<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const isParent = (user as any)?.role === "parent";

  const { data: comp, isLoading, isError } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => competitionsService.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (comp) {
      Analytics.track("competition_viewed", {
        competitionId: comp.id,
        name: comp.name,
        category: comp.category,
      });
    }
  }, [comp?.id]);

  // Sprint 4, Track A (T3) - Track view duration
  useEffect(() => {
    // Record start time when component mounts
    viewStartTime.current = Date.now();

    // Track view duration on unmount
    return () => {
      if (viewStartTime.current && comp?.id) {
        const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);

        // Only track if user spent >= 10 seconds (filter accidental clicks)
        if (duration >= 10) {
          competitionsService.trackView(comp.id, duration);
        }
      }
    };
  }, [comp?.id]);

  // Reset tab when id changes
  useEffect(() => {
    setActiveTab("overview");
  }, [id]);

  // Check if competition is favorited
  useEffect(() => {
    const checkFavorite = async () => {
      if (!id) return;
      try {
        const favorited = await favoritesService.checkFavorited(id);
        setIsFavorited(favorited);
      } catch (err) {
        console.error("Check favorite error:", err);
      }
    };
    checkFavorite();
  }, [id]);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push("/(tabs)/competitions");
  };

  const handleToggleFavorite = async () => {
    if (!id || loadingFavorite) return;

    setLoadingFavorite(true);
    try {
      if (isFavorited) {
        await favoritesService.remove(id);
        setIsFavorited(false);
        Alert.alert("Removed", "Competition removed from favorites");
      } else {
        await favoritesService.add(id);
        setIsFavorited(true);
        Alert.alert("Added", "Competition added to favorites");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update favorite");
    } finally {
      setLoadingFavorite(false);
    }
  };

  // Check if already registered
  const existingRegistration = comp
    ? registrations.find((registration) => registration.compId === comp.id)
    : null;
  const already = !!existingRegistration;

  // Check if registration is closed
  const isClosed = comp?.regCloseDate
    ? new Date(comp.regCloseDate) < new Date()
    : false;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </View>
    );
  }

  if (isError || !comp) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <IconSymbol size={24} name="chevron.left" color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>Competition not found</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Unable to load competition.</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Extract categories for display
  const categories = comp.category
    .split("\n")
    .map((cat) => cat.trim())
    .filter(Boolean);
  const firstCategory = categories[0] || "General";
  const categoryDisplay = categories.length > 1
    ? `${firstCategory} +${categories.length - 1} more`
    : firstCategory;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <IconSymbol size={24} name="chevron.left" color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {comp.name}
        </Text>
        {isParent ? <View style={{ width: 24 }} /> : (
          <Pressable
            onPress={handleToggleFavorite}
            style={styles.favoriteBtn}
            disabled={loadingFavorite}
          >
            <Text style={styles.favoriteIcon}>
              {loadingFavorite ? "⏳" : isFavorited ? "❤️" : "🤍"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.emoji}>
          {CATEGORY_EMOJIS[firstCategory] ?? "🏆"}
        </Text>
        <Text style={styles.compTitle}>{comp.name}</Text>
        <Text style={styles.compOrg}>{comp.organizerName}</Text>
        <Text style={styles.compMeta}>
          {categoryDisplay} · {comp.gradeLevel.replace(/,/g, ", ")} ·{" "}
          Closes {formatDate(comp.regCloseDate)}
        </Text>
        <Text style={[styles.compPrice, { marginTop: 12 }]}>
          {formatPrice(comp.fee)}
        </Text>
        {isClosed && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Registration Closed</Text>
          </View>
        )}
      </View>

      {/* Tab nav */}
      <View style={styles.tabNav}>
        {(["overview", "registration", "payment"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}
            >
              {tab === "overview" ? "About" : tab === "registration" ? "Register" : "Payment"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView contentContainerStyle={styles.tabContent}>
        {activeTab === "overview" && (
          <View>
            <Text style={styles.sectionTitle}>About the Competition</Text>
            <Text style={styles.sectionText}>{comp.description}</Text>

            {categories.length > 1 && (
              <>
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {categories.map((cat, idx) => (
                    <View
                      key={idx}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: "#F1F5F9",
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#475569" }}>
                        {cat}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Important Dates</Text>
            <View style={styles.infoBox}>
              <Text style={styles.boxLabel}>Registration Opens</Text>
              <Text style={styles.boxValue}>{formatDate(comp.regOpenDate)}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.boxLabel}>Registration Closes</Text>
              <Text style={styles.boxValue}>{formatDate(comp.regCloseDate)}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.boxLabel}>Competition Date</Text>
              <Text style={styles.boxValue}>{formatDate(comp.competitionDate)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Education Level</Text>
            <Text style={styles.sectionText}>
              {comp.gradeLevel.replace(/,/g, ", ")}
            </Text>

            {comp.quota && (
              <>
                <Text style={styles.sectionTitle}>Participant Quota</Text>
                <Text style={styles.sectionText}>{comp.quota} participants</Text>
              </>
            )}
          </View>
        )}

        {activeTab === "registration" && (
          <View>
            <Text style={styles.sectionTitle}>Registration Status</Text>
            <View style={styles.infoBox}>
              <Text style={styles.boxLabel}>Your Status</Text>
              <Text style={[styles.boxValue, { color: already ? "#059669" : "#94A3B8" }]}>
                {already ? "✓ Already Registered" : "Not Registered"}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Required Documents</Text>
            {comp.requiredDocs.length > 0 ? (
              comp.requiredDocs.map((doc, i) => (
                <View key={i} style={styles.docItem}>
                  <Text style={styles.docBullet}>•</Text>
                  <Text style={styles.docText}>
                    {doc.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.sectionText}>No documents required.</Text>
            )}
          </View>
        )}

        {activeTab === "payment" && (
          <View>
            <Text style={styles.sectionTitle}>Registration Fee</Text>
            <View style={styles.infoBox}>
              <Text style={styles.boxLabel}>Total Fee</Text>
              <Text style={[styles.boxValue, { fontSize: 20, fontWeight: "800" }]}>
                {formatPrice(comp.fee)}
              </Text>
            </View>

            {comp.fee > 0 ? (
              <Text style={[styles.sectionText, { marginTop: 12 }]}>
                Payment methods (GoPay, OVO, Dana, Bank Transfer) will be available after you register.
                Midtrans integration is under development.
              </Text>
            ) : (
              <Text style={[styles.sectionText, { marginTop: 12, color: "#059669" }]}>
                ✓ This competition is FREE! No registration fee.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Register CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[
            styles.registerBtn,
            isClosed && !already && styles.registerBtnDisabled,
          ]}
          onPress={async () => {
            if (!already && !isClosed) {
              Analytics.track("registration_started", {
                competitionId: comp.id,
                name: comp.name,
                fee: comp.fee,
              });
              const reg = await registerCompetition(comp.id, { competitionName: comp.name, fee: comp.fee, category: comp.category });
              if (comp.fee > 0 && reg.status === "pending_payment") {
                router.push({ pathname: "/(payment)/pay", params: { registrationId: reg.id } });
              } else {
                router.push("/(tabs)/my-competitions");
              }
              return;
            }
            if (existingRegistration && (existingRegistration.status === "pending_payment" || existingRegistration.status === "registered")) {
              router.push({ pathname: "/(payment)/pay", params: { registrationId: existingRegistration.id } });
              return;
            }
            if (existingRegistration && ["approved", "paid", "completed"].includes(existingRegistration.status)) {
              router.push({
                pathname: "/(tabs)/my-registration-details",
                params: { id: existingRegistration.id },
              });
              return;
            }
            router.push("/(tabs)/my-competitions");
          }}
          disabled={isClosed && !already}
        >
          <Text style={styles.registerBtnText}>
            {isClosed
              ? "Registration Closed"
              : already
              ? existingRegistration && (existingRegistration.status === "pending_payment" || existingRegistration.status === "registered")
                ? "Complete Payment"
                : existingRegistration && ["approved", "paid", "completed"].includes(existingRegistration.status)
                ? "Open Competition Hub"
                : "View Application"
              : "Register Now"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginHorizontal: 8,
  },
  favoriteBtn: {
    padding: 8,
    marginRight: -8,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  infoCard: {
    backgroundColor: "#fff",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  emoji: { fontSize: 48 },
  compTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
    textAlign: "center",
  },
  compOrg: { color: "#64748B", marginTop: 4, textAlign: "center" },
  compMeta: { color: "#94A3B8", fontSize: 12, marginTop: 4, textAlign: "center" },
  compPrice: { fontWeight: "800", color: "#0F172A", textAlign: "center", fontSize: 16 },
  closedBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  closedText: { color: "#DC2626", fontWeight: "700", fontSize: 12 },
  tabNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Brand.primary },
  tabLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  tabLabelActive: { color: Brand.primary },
  tabContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 120 },
  sectionTitle: {
    fontWeight: "800",
    fontSize: 16,
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 8,
  },
  sectionText: { color: "#334155", lineHeight: 22, marginTop: 4 },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  boxLabel: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  boxValue: { color: "#0F172A", fontWeight: "700", marginTop: 6 },
  docItem: { flexDirection: "row", marginBottom: 8 },
  docBullet: { color: Brand.primary, fontWeight: "800", marginRight: 8, fontSize: 16 },
  docText: { flex: 1, color: "#334155", lineHeight: 22 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  registerBtn: {
    backgroundColor: Brand.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  registerBtnDisabled: { backgroundColor: "#CBD5E1" },
  registerBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  errorText: { color: "#64748B", fontSize: 14, marginBottom: 16 },
  retryBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
