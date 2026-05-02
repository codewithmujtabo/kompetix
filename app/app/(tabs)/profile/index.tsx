import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { router, useFocusEffect } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, registrations, refreshRegistrations } = useUser();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      refreshRegistrations();
    }, [refreshRegistrations])
  );

  const fullName = (user as any)?.fullName ?? (user as any)?.name ?? "—";
  const initial = fullName.charAt(0).toUpperCase();
  const photoUrl = (user as any)?.photoUrl || (user as any)?.avatarUrl;
  const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace("/api", "") || "";

  const roleLabel: Record<string, string> = {
    student: "Student",
    parent: "Parent",
    teacher: "Teacher",
    school_admin: "School Admin",
  };
  const roleMeta: Record<string, string> = {
    student: "👨‍🎓",
    parent: "👨‍👩‍👧",
    teacher: "👨‍🏫",
    school_admin: "👔",
  };
  const role = (user as any)?.role ?? "student";
  const roleDisplay = roleLabel[role] ?? role;
  const roleIcon = roleMeta[role] ?? "👤";

  // Only show registration stats for students
  const totalComps = role === "student" ? registrations.length : 0;
  const completed = role === "student" ? registrations.filter((r) => r.status === "completed").length : 0;
  const active = role === "student" ? registrations.filter((r) => r.status === "paid").length : 0;

  const menuItems = [
    {
      emoji: "👤",
      label: "Edit Profile",
      onPress: () => router.push("/(tabs)/profile/edit"),
    },
    ...(role === "student"
      ? [
          {
            emoji: "📄",
            label: "Document Vault",
            onPress: () => router.push("/(tabs)/profile/document-vault"),
          },
          {
            emoji: "👨‍👩‍👧",
            label: "Link Parent Account",
            onPress: () => router.push("/(tabs)/profile/link-parent"),
          },
        ]
      : []),
    ...(role === "school_admin"
      ? [
          {
            emoji: "📊",
            label: "School Dashboard",
            onPress: () => router.push("/school-dashboard"),
          },
          {
            emoji: "📤",
            label: "Bulk Registration",
            onPress: () => router.push("/bulk-registration"),
          },
        ]
      : []),
    {
      emoji: "🔔",
      label: "Notifications",
      onPress: () => router.push("/(tabs)/notifications"),
    },
    {
      emoji: "⚙️",
      label: "Account Settings",
      onPress: () => {}, // TODO: Implement in future sprint
    },
    {
      emoji: "❓",
      label: "Help & FAQ",
      onPress: () => {}, // TODO: Implement in future sprint
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar card */}
      <View style={styles.avatarCard}>
        {/* Avatar with ring */}
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image
                source={{ uri: `${API_BASE}${photoUrl}` }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
          </View>
        </View>

        <Text style={styles.name}>{fullName}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {roleIcon} {roleDisplay}
          </Text>
        </View>

        {((user as any)?.city || (user as any)?.school) && (
          <Text style={styles.meta}>
            {[(user as any)?.school, (user as any)?.city]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
      </View>

      {/* Live stats row - Students only */}
      {role === "student" && (
        <View style={styles.statsRow}>
          {[
            { label: "Total", value: String(totalComps) },
            { label: "Active", value: String(active) },
            { label: "Completed", value: String(completed) },
          ].map((s, i) => (
            <View
              key={s.label}
            style={[
              styles.statItem,
              i < 2 && styles.statItemBorder,
            ]}
          >
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
        </View>
      )}

      {/* Menu */}
      <View style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              i < menuItems.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => router.replace("/(auth)/login" as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>🚪 Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  // Avatar card
  avatarCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 14,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Brand.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    padding: 3,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "800", color: "#fff" },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  roleBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginBottom: 8,
  },
  roleBadgeText: { fontSize: 13, fontWeight: "700", color: Brand.primary },
  meta: { fontSize: 13, color: "#94A3B8", textAlign: "center" },

  // Stats row
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: "center" },
  statItemBorder: {
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Brand.primary,
    marginBottom: 3,
  },
  statLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },

  // Menu card
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  menuEmoji: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0F172A" },
  menuChevron: { fontSize: 22, color: "#CBD5E1", fontWeight: "300" },

  // Sign out
  signOutBtn: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  signOutText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
});
