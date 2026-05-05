import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import * as paymentsService from "@/services/payments.service";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PaymentState =
  | "loading"    // fetching snap token
  | "opening"    // browser is open
  | "success"    // settlement / capture
  | "pending"    // waiting for bank transfer / QRIS
  | "failed"     // deny / cancel / expire
  | "cancelled"  // user closed browser without paying
  | "error";     // network / server error

const STATE_CONTENT: Record<
  Exclude<PaymentState, "loading" | "opening">,
  { emoji: string; title: string; subtitle: string; accent: string }
> = {
  success: {
    emoji: "🎉",
    title: "Payment Completed!",
    subtitle: "Your payment has been confirmed. Your spot is secured! Head back to My Competitions to track your registration.",
    accent: "#059669",
  },
  pending: {
    emoji: "⏳",
    title: "Payment Pending",
    subtitle: "Your payment is being processed. We'll notify you once it's confirmed. You can close this screen.",
    accent: "#D97706",
  },
  failed: {
    emoji: "❌",
    title: "Payment Failed",
    subtitle: "Transaction was unsuccessful. Please try again or use a different payment method.",
    accent: "#EF4444",
  },
  cancelled: {
    emoji: "↩️",
    title: "Page Closed",
    subtitle: "You closed the payment page. If you already paid, your registration will be updated automatically. Otherwise, try again.",
    accent: "#64748B",
  },
  error: {
    emoji: "😕",
    title: "An Error Occurred",
    subtitle: "Unable to load payment page. Please try again in a moment.",
    accent: "#EF4444",
  },
};

export default function PayScreen() {
  const { registrationId } = useLocalSearchParams<{ registrationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshRegistrations } = useUser();

  const [paymentState, setPaymentState] = useState<PaymentState>("loading");
  const [errorDetail, setErrorDetail] = useState("");

  const started = useRef(false);

  const startPayment = useCallback(async () => {
    if (!registrationId) {
      setPaymentState("error");
      setErrorDetail("Registration ID not found.");
      return;
    }

    try {
      setPaymentState("loading");

      const { redirectUrl } = await paymentsService.createSnapToken(registrationId);

      setPaymentState("opening");
      const result = await WebBrowser.openAuthSessionAsync(redirectUrl, "kompetix://");

      if (result.type === "success" && result.url) {
        const urlObj = new URL(result.url);
        const txStatus = urlObj.searchParams.get("transaction_status");
        const statusCode = urlObj.searchParams.get("status_code");

        if (txStatus === "settlement" || txStatus === "capture" || statusCode === "200") {
          await refreshRegistrations();
          setPaymentState("success");
        } else if (txStatus === "pending") {
          setPaymentState("pending");
        } else {
          setPaymentState("failed");
        }
      } else {
        // Browser closed without deep-link — webhook may have already arrived
        await refreshRegistrations();
        setPaymentState("cancelled");
      }
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes("already paid")) {
        await refreshRegistrations();
        setPaymentState("success");
        return;
      }
      console.error("Payment error:", err);
      setErrorDetail(err?.message || "");
      setPaymentState("error");
    }
  }, [registrationId, refreshRegistrations]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startPayment();
  }, [startPayment]);

  if (paymentState === "loading" || paymentState === "opening") {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <Text style={styles.loadingText}>
          {paymentState === "loading" ? "Preparing payment..." : "Opening payment page..."}
        </Text>
      </View>
    );
  }

  const content = STATE_CONTENT[paymentState];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{content.emoji}</Text>
        <Text style={[styles.title, { color: content.accent }]}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>
        {paymentState === "error" && errorDetail ? (
          <Text style={styles.errorDetail}>{errorDetail}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {paymentState === "success" || paymentState === "pending" ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/(tabs)/my-competitions")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>View My Competitions</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { started.current = false; startPayment(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {paymentState === "cancelled" && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => { started.current = false; startPayment(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Pay Now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    gap: 16,
  },
  loadingText: { fontSize: 15, color: "#64748B", textAlign: "center" },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  emoji:    { fontSize: 64, marginBottom: 16 },
  title:    { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 22 },
  errorDetail: { marginTop: 12, fontSize: 12, color: "#EF4444", textAlign: "center" },
  actions:      { gap: 12 },
  primaryBtn:   { backgroundColor: Brand.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondaryBtn:   { borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: "#F1F5F9" },
  secondaryBtnText: { color: "#64748B", fontWeight: "600", fontSize: 15 },
});
