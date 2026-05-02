import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import {
  inviteParent,
  getPendingInvitations,
  approveLink,
  getDebugInvitations,
} from "@/services/parents.service";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function LinkParentScreen() {
  const { user } = useUser();
  const studentId = (user as any)?.id;
  const [parentEmail, setParentEmail] = useState("");
  const [latestDebugPin, setLatestDebugPin] = useState<string | null>(null);
  const [latestDebugEmail, setLatestDebugEmail] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const isDebugMode = __DEV__;

  // Fetch pending invitations
  const {
    data: pendingInvitations,
    isLoading,
    isError,
    error,
    refetch: refetchPendingInvitations,
  } = useQuery({
    queryKey: ["pendingInvitations", studentId],
    queryFn: getPendingInvitations,
    enabled: !!studentId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const normalizedEmail = useMemo(() => parentEmail.trim().toLowerCase(), [parentEmail]);
  const { data: recentDebugInvites = [] } = useQuery({
    queryKey: ["parentDebugInvitations", studentId, normalizedEmail],
    queryFn: () => getDebugInvitations(normalizedEmail || undefined),
    enabled: isDebugMode && !!studentId,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (studentId) {
        void refetchPendingInvitations();
        if (isDebugMode) {
          void queryClient.invalidateQueries({
            queryKey: ["parentDebugInvitations", studentId],
          });
        }
      }
    }, [studentId, refetchPendingInvitations, queryClient, isDebugMode])
  );

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: inviteParent,
    onSuccess: (data) => {
      setLatestDebugPin(data.debugPin || null);
      setLatestDebugEmail(data.debugEmail || null);
      Alert.alert(
        "Success",
        data.debugPin
          ? `Invitation created in debug mode. Use PIN ${data.debugPin} for testing.`
          : "Invitation sent! Your parent will receive a PIN code via email."
      );
      setParentEmail("");
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations", studentId] });
      queryClient.invalidateQueries({ queryKey: ["parentDebugInvitations", studentId] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to send invitation");
    },
  });

  // Approve link mutation
  const approveLinkMutation = useMutation({
    mutationFn: ({ linkId, status }: { linkId: string; status: 'active' | 'rejected' }) =>
      approveLink(linkId, status),
    onSuccess: (_, variables) => {
      const message = variables.status === 'active'
        ? "Parent link approved!"
        : "Parent link rejected";
      Alert.alert("Success", message);
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations", studentId] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to update link");
    },
  });

  const handleSendInvitation = async () => {
    if (!parentEmail.trim()) {
      Alert.alert("Error", "Please enter your parent's email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail.trim())) {
      Alert.alert("Error", "Please enter a valid email address (e.g., parent@example.com)");
      return;
    }

    sendInvitationMutation.mutate(parentEmail.trim());
  };

  const handleApprove = (linkId: string) => {
    Alert.alert(
      "Approve Parent Link",
      "Are you sure you want to approve this parent account link?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => approveLinkMutation.mutate({ linkId, status: 'active' }),
        },
      ]
    );
  };

  const handleReject = (linkId: string) => {
    Alert.alert(
      "Reject Parent Link",
      "Are you sure you want to reject this parent account link?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => approveLinkMutation.mutate({ linkId, status: 'rejected' }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={Brand.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Link Parent Account</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Invitation Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite Parent</Text>
          <Text style={styles.cardSubtitle}>
            Enter your parent&apos;s email address. A 6-digit PIN code will be sent to their email inbox. The PIN is valid for 24 hours.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="parent@example.com"
            placeholderTextColor="#94A3B8"
            value={parentEmail}
            onChangeText={setParentEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!sendInvitationMutation.isPending}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              sendInvitationMutation.isPending && styles.sendButtonDisabled,
            ]}
            onPress={handleSendInvitation}
            disabled={sendInvitationMutation.isPending}
          >
            {sendInvitationMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send Invitation</Text>
            )}
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles.infoBox}>
            <IconSymbol name="info.circle" size={20} color={Brand.primary} />
            <Text style={styles.infoText}>
              After sending, your parent should:{"\n"}
              1. Check their email for the PIN{"\n"}
              2. Open the app and go to &quot;Children&quot; tab{"\n"}
              3. Tap &quot;Accept Invitation&quot; and enter the PIN{"\n"}
              4. You&apos;ll then approve the connection
            </Text>
          </View>

          {isDebugMode && (
            <View style={styles.debugBox}>
              <Text style={styles.debugTitle}>Developer Testing Mode</Text>
              <Text style={styles.debugText}>
                If SMTP is not configured, the backend will still create the invitation and expose the PIN here for testing.
              </Text>

              {latestDebugPin ? (
                <View style={styles.debugPinCard}>
                  <Text style={styles.debugPinLabel}>Latest PIN</Text>
                  <Text style={styles.debugPinValue}>{latestDebugPin}</Text>
                  <Text style={styles.debugPinEmail}>{latestDebugEmail}</Text>
                </View>
              ) : null}

              {recentDebugInvites.length > 0 ? (
                <View style={styles.debugList}>
                  <Text style={styles.debugListTitle}>Recent Invitations</Text>
                  {recentDebugInvites.slice(0, 3).map((invite) => (
                    <View key={invite.invitationId} style={styles.debugListItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.debugListEmail}>{invite.parentEmail}</Text>
                        <Text style={styles.debugListMeta}>
                          {invite.status} • expires {new Date(invite.expiresAt).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.debugListPin}>{invite.pin}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Pending Approvals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Approvals</Text>
          <Text style={styles.cardSubtitle}>
            Parents who have entered the PIN and are waiting for your approval
          </Text>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={Brand.primary} />
          ) : isError ? (
            <Text style={styles.errorText}>
              {(error as Error)?.message || "Failed to load pending approvals"}
            </Text>
          ) : pendingInvitations && pendingInvitations.length > 0 ? (
            pendingInvitations.map((invite) => (
              <View key={invite.linkId} style={styles.inviteCard}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteName}>{invite.parentName}</Text>
                  <Text style={styles.inviteEmail}>{invite.parentEmail}</Text>
                  <Text style={styles.inviteDate}>
                    Requested: {new Date(invite.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={[
                      styles.approveButton,
                      approveLinkMutation.isPending && styles.buttonDisabled,
                    ]}
                    onPress={() => handleApprove(invite.linkId)}
                    disabled={approveLinkMutation.isPending}
                  >
                    {approveLinkMutation.isPending ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <IconSymbol name="checkmark.circle.fill" size={24} color="#10B981" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      approveLinkMutation.isPending && styles.buttonDisabled,
                    ]}
                    onPress={() => handleReject(invite.linkId)}
                    disabled={approveLinkMutation.isPending}
                  >
                    {approveLinkMutation.isPending ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No pending approvals</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  placeholder: {
    width: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 12,
  },
  sendButton: {
    backgroundColor: Brand.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F0F5FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: Brand.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  debugBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 6,
  },
  debugText: {
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  debugPinCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  debugPinLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  debugPinValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Brand.primary,
    letterSpacing: 4,
  },
  debugPinEmail: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  debugList: {
    marginTop: 12,
  },
  debugListTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 8,
  },
  debugListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  debugListEmail: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  debugListMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  debugListPin: {
    fontSize: 18,
    fontWeight: "800",
    color: Brand.primary,
    letterSpacing: 2,
  },
  loader: {
    marginVertical: 20,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    marginTop: 12,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  inviteEmail: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },
  inviteDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 12,
  },
});
