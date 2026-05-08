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
  | "selecting"  // user picks payer attribution before launching
  | "loading"    // fetching snap token
  | "opening"    // browser is open
  | "success"    // settlement / capture
  | "pending"    // waiting for bank transfer / QRIS
  | "failed"     // deny / cancel / expire
  | "cancelled"  // user closed browser without paying
  | "error";     // network / server error

type PayerKind = "self" | "parent" | "school" | "sponsor";

const PAYER_OPTIONS: Array<{ value: PayerKind; label: string; subtitle: string }> = [
  { value: "self",    label: "Saya sendiri",    subtitle: "Pembayaran atas nama saya" },
  { value: "parent",  label: "Orang tua / wali", subtitle: "Receipt akan diterbitkan atas nama orang tua" },
  { value: "school",  label: "Sekolah",          subtitle: "Sekolah yang menanggung biaya" },
  { value: "sponsor", label: "Sponsor",          subtitle: "Pihak ketiga (yayasan, perusahaan)" },
];

const STATE_CONTENT: Record<
  Exclude<PaymentState, "selecting" | "loading" | "opening">,
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

  const [paymentState, setPaymentState] = useState<PaymentState>("selecting");
  const [loadingMessage, setLoadingMessage] = useState("Preparing payment...");
  const [errorDetail, setErrorDetail] = useState("");
  const [payerKind, setPayerKind] = useState<PayerKind>("self");

  const started = useRef(false);

  // Poll /payments/verify until DB shows paid — works in sandbox where webhook can't reach localhost
  const pollVerify = useCallback(async (regId: string, attempts = 6, delayMs = 3000): Promise<boolean> => {
    for (let i = 0; i < attempts; i++) {
      if (i > 0) await new Promise(res => setTimeout(res, delayMs));
      try {
        const { status } = await paymentsService.verifyPayment(regId);
        if (status === "paid") return true;
      } catch {
        // ignore transient errors, keep polling
      }
    }
    return false;
  }, []);

  const startPayment = useCallback(async () => {
    if (!registrationId) {
      setPaymentState("error");
      setErrorDetail("Registration ID not found.");
      return;
    }

    try {
      setLoadingMessage("Preparing payment...");
      setPaymentState("loading");

      const { redirectUrl } = await paymentsService.createSnapToken(registrationId, payerKind);

      setPaymentState("opening");
      // Dismiss any lingering session from a previous attempt before opening a new one
      WebBrowser.dismissAuthSession();
      const result = await WebBrowser.openAuthSessionAsync(redirectUrl, "competzy://");

      // In both success-redirect and dismiss cases, always verify via backend.
      // The backend calls Midtrans Status API and syncs the DB — this fixes sandbox
      // where Midtrans can't reach localhost to fire the webhook.
      setLoadingMessage("Verifying payment status...");
      setPaymentState("loading");

      if (result.type === "success" && result.url) {
        const urlObj = new URL(result.url);
        const txStatus = urlObj.searchParams.get("transaction_status");

        if (txStatus === "pending") {
          await refreshRegistrations();
          setPaymentState("pending");
          return;
        }

        if (["deny", "cancel", "expire", "failure"].includes(txStatus ?? "")) {
          setPaymentState("failed");
          return;
        }

        // settlement / capture (or unknown) — verify with backend
        const paid = await pollVerify(registrationId);
        await refreshRegistrations();
        setPaymentState(paid ? "success" : "cancelled");
      } else {
        // Browser dismissed — verify with backend before giving up
        const paid = await pollVerify(registrationId);
        await refreshRegistrations();
        setPaymentState(paid ? "success" : "cancelled");
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
  }, [registrationId, refreshRegistrations, pollVerify, payerKind]);

  // No auto-start; user must pick a payer first.
  // (Earlier auto-launch removed: parent-payer attribution is a validated pain point per spec F-PY-03.)

  if (paymentState === "selecting") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.card}>
          <Text style={styles.emoji}>💳</Text>
          <Text style={[styles.title, { color: Brand.primary }]}>Dibayar Oleh</Text>
          <Text style={styles.subtitle}>
            Receipt akan dikirim atas nama pembayar. Pilih siapa yang menanggung biaya ini.
          </Text>
        </View>

        <View style={{ gap: 10, marginBottom: 16 }}>
          {PAYER_OPTIONS.map((opt) => {
            const selected = payerKind === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setPayerKind(opt.value)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 2,
                  borderColor: selected ? Brand.primary : "#E2E8F0",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected ? Brand.primary : "#CBD5E1",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  {selected ? (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Brand.primary }} />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>{opt.label}</Text>
                  <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{opt.subtitle}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              if (started.current) return;
              started.current = true;
              startPayment();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Lanjutkan ke Pembayaran</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (paymentState === "loading" || paymentState === "opening") {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <Text style={styles.loadingText}>
          {paymentState === "opening" ? "Opening payment page..." : loadingMessage}
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
            onPress={startPayment}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {paymentState === "cancelled" && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={startPayment}
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
          <Text style={styles.secondaryBtnText}>Back</Text>
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
