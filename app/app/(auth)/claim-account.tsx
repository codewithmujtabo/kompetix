import { AppInput } from "@/components/common/AppInput";
import * as authService from "@/services/auth.service";
import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { router, useLocalSearchParams } from "expo-router";
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

export default function ClaimAccountScreen() {
  const insets = useSafeAreaInsets();
  const { fetchUser } = useUser();
  const params = useLocalSearchParams<{ phone: string; fullName: string; email: string }>();

  const [fullName, setFullName] = useState(params.fullName ?? "");
  const [email, setEmail]       = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleClaim() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { user } = await authService.signup({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: params.phone,
        city: "",
        role: "student",
        roleData: {},
        consentAccepted: true,
      });
      if (user) {
        fetchUser(user.id);
        router.replace("/(tabs)/competitions");
      }
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() ?? "";
      if (msg.includes("email already")) {
        Alert.alert("Email Taken", "This email is already registered. Try a different one or log in.");
      } else {
        Alert.alert("Error", err?.message ?? "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.badgeBox}>
            <Text style={styles.badgeEmoji}>🏅</Text>
          </View>
          <Text style={styles.title}>We Found Your Records!</Text>
          <Text style={styles.subtitle}>
            Your phone number matches our previous competition data.{"\n"}
            Set a password to access your history and join new competitions.
          </Text>
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>Phone verified: {params.phone}</Text>
        </View>

        <View style={styles.form}>
          <AppInput
            label="Full Name"
            placeholder="Your full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            error={errors.fullName}
            editable={!loading}
          />
          <AppInput
            label="Email"
            placeholder="e.g. student@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            editable={!loading}
          />
          <AppInput
            label="Password"
            placeholder="Choose a password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
            error={errors.password}
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPwd(v => !v)}>
            <Text style={styles.togglePwd}>{showPwd ? "Hide" : "Show"} password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleClaim}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Create Account & View My Records</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scroll:    { paddingHorizontal: 20, paddingBottom: 40 },
  header:    { alignItems: "center", marginBottom: 24 },
  badgeBox:  {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: Brand.primary + "20",
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  badgeEmoji: { fontSize: 34 },
  title:      { fontSize: 26, fontWeight: "800", color: "#0F172A", marginBottom: 10, textAlign: "center" },
  subtitle:   { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 22 },
  infoBanner: {
    backgroundColor: "#EEF2FF", borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 20,
    alignItems: "center",
  },
  infoText: { fontSize: 13, color: Brand.primary, fontWeight: "600", fontVariant: ["tabular-nums"] },
  form:       { gap: 16, marginBottom: 24 },
  togglePwd:  { color: Brand.primary, fontSize: 13, fontWeight: "600", marginTop: -8 },
  btn:        { backgroundColor: Brand.primary, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText:    { color: "#fff", fontSize: 15, fontWeight: "700" },
  footer:     { flexDirection: "row", justifyContent: "center", gap: 4 },
  footerText: { fontSize: 13, color: "#64748B" },
  footerLink: { fontSize: 13, color: Brand.primary, fontWeight: "700" },
});
