import { AppInput } from "@/components/common/AppInput";
import * as authService from "@/services/auth.service";
import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AuthTab = "email" | "phone";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { fetchUser } = useUser();

  const [authTab, setAuthTab] = useState<AuthTab>("email");

  // Email + password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone + OTP
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function switchTab(tab: AuthTab) {
    setAuthTab(tab);
    setErrors({});
    setPhoneOtpSent(false);
    setPhoneOtp("");
  }

  function validateEmailPassword() {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validatePhone() {
    const e: Record<string, string> = {};
    const digits = phone.replace(/\D/g, "");
    if (!phone.trim()) e.phone = "Phone number is required";
    else if (digits.length < 9 || digits.length > 13) e.phone = "Enter a valid Indonesian phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSuccess(user: any) {
    fetchUser(user?.id);

    // Navigate to role-specific screen
    const userRole = user?.role;
    if (userRole === "admin") {
      router.replace("/(tabs)/admin-competitions");
    } else if (userRole === "teacher") {
      router.replace("/(tabs)/teacher-dashboard");
    } else if (userRole === "parent") {
      router.replace("/(tabs)/children");
    } else if (userRole === "school_admin") {
      router.replace("/(tabs)/profile");
    } else {
      router.replace("/(tabs)/competitions");
    }
  }

  // ── Email + password ────────────────────────────────────────────────────────

  async function handleEmailLogin() {
    if (!validateEmailPassword()) return;
    setLoading(true);
    try {
      const { user } = await authService.login(email.trim(), password.trim());
      if (user) onSuccess(user);
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || "";
      Alert.alert(
        "Login Failed",
        msg.includes("invalid") ? "Email or password is incorrect" : err.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Phone OTP ───────────────────────────────────────────────────────────────

  async function handleSendPhoneOtp() {
    if (!validatePhone()) return;
    setLoading(true);
    try {
      await authService.sendPhoneOtp(phone.trim());
      setPhoneOtpSent(true);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    if (!phoneOtp.trim() || phoneOtp.length < 6) {
      setErrors({ phoneOtp: "Enter the 6-digit OTP" });
      return;
    }
    setLoading(true);
    try {
      const result = await authService.verifyPhoneOtp(phone.trim(), phoneOtp);
      if ("noAccount" in result) {
        Alert.alert(
          "No Account Found",
          "This phone number is not registered. Please sign up first.",
          [
            { text: "Sign Up", onPress: () => router.push("/(auth)/register") },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }
      if (result.user) onSuccess(result.user);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🏆</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your competitions, results, and certificates.
          </Text>
        </View>

        {/* Tab toggle */}
        <View style={styles.tabRow}>
          {(["email", "phone"] as AuthTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, authTab === tab && styles.tabActive]}
              onPress={() => switchTab(tab)}
            >
              <Text style={[styles.tabText, authTab === tab && styles.tabTextActive]}>
                {tab === "email" ? "Email" : "Phone Number"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Email + Password ── */}
        {authTab === "email" && (
          <View style={styles.form}>
            <AppInput
              label="Email"
              placeholder="e.g. john@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              editable={!loading}
            />
            <AppInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
              <Text style={styles.linkText}>{showPassword ? "Hide" : "Show"} password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Phone OTP ── */}
        {authTab === "phone" && (
          <View style={styles.form}>
            {!phoneOtpSent ? (
              <>
                <AppInput
                  label="Phone Number"
                  placeholder="e.g. 08123456789"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  error={errors.phone}
                  editable={!loading}
                />
                <Text style={styles.hint}>Indonesian format: 08xxx or +628xxx</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                  onPress={handleSendPhoneOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.hint}>OTP sent to {phone}</Text>
                <AppInput
                  label="OTP Code"
                  placeholder="Enter 6-digit OTP"
                  value={phoneOtp}
                  onChangeText={setPhoneOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  error={errors.phoneOtp}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                  onPress={handleVerifyPhoneOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setPhoneOtpSent(false); setPhoneOtp(""); setErrors({}); }}
                >
                  <Text style={styles.linkText}>← Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Brand.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 32 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 20 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  tabTextActive: { color: Brand.primary },
  form: { gap: 16, marginBottom: 24 },
  primaryBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  linkText: { color: Brand.primary, fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12, color: "#94A3B8", marginTop: -8 },
  footer: { flexDirection: "row", justifyContent: "center", gap: 4 },
  footerText: { fontSize: 13, color: "#64748B" },
  footerLink: { fontSize: 13, color: Brand.primary, fontWeight: "700" },
});
