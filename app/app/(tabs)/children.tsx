import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { getMyChildren, acceptInvitation } from "@/services/parents.service";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ChildrenScreen() {
  const params = useLocalSearchParams<{ studentId?: string; compId?: string }>();
  const { user } = useUser();
  const userRole = (user as any)?.role;
  const parentId = (user as any)?.id;
  const [showPinModal, setShowPinModal] = useState(false);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const queryClient = useQueryClient();
  const highlightedStudentId =
    typeof params.studentId === "string" ? params.studentId : undefined;
  const highlightedCompId =
    typeof params.compId === "string" ? params.compId : undefined;

  // Fetch linked children (hooks must come before any returns)
  const { data: children, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["myChildren", parentId],
    queryFn: () => getMyChildren(),
    enabled: userRole === "parent" && !!parentId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (userRole === "parent" && parentId) {
        void refetch();
      }
    }, [userRole, parentId, refetch])
  );

  // Accept invitation mutation (hooks must come before any returns)
  const acceptInvitationMutation = useMutation({
    mutationFn: ({ email, pin }: { email: string; pin: string }) => acceptInvitation(email, pin),
    onSuccess: () => {
      Alert.alert(
        "Success",
        "Link created! Waiting for student approval.",
        [{ text: "OK", onPress: () => setShowPinModal(false) }]
      );
      setEmail("");
      setPin("");
      queryClient.invalidateQueries({ queryKey: ["myChildren", parentId] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Invalid or expired PIN");
    },
  });

  // Redirect non-parents away from this screen
  useEffect(() => {
    if (userRole && userRole !== "parent") {
      if (userRole === "teacher") {
        router.replace("/(tabs)/teacher-dashboard");
      } else if (userRole === "school_admin") {
        router.replace("/(tabs)/profile");
      } else {
        router.replace("/(tabs)/competitions");
      }
    }
  }, [userRole]);

  const handleAcceptInvitation = () => {
    if (!email.trim() || !pin.trim()) {
      Alert.alert("Error", "Please enter both email and PIN");
      return;
    }

    if (pin.length !== 6) {
      Alert.alert("Error", "PIN must be 6 digits");
      return;
    }

    acceptInvitationMutation.mutate({ email, pin });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      paid: "#10B981",
      registered: "#F59E0B",
      pending: "#94A3B8",
      approved: "#10B981",
      pending_review: "#3B82F6",
      rejected: "#EF4444",
    };

    return (
      <View style={[styles.badge, { backgroundColor: colors[status as keyof typeof colors] || "#94A3B8" }]}>
        <Text style={styles.badgeText}>{status}</Text>
      </View>
    );
  };

  const sortedChildren = React.useMemo(() => {
    if (!children) return [];

    return [...children].sort((a, b) => {
      const aHighlighted = highlightedStudentId && a.studentId === highlightedStudentId ? 1 : 0;
      const bHighlighted = highlightedStudentId && b.studentId === highlightedStudentId ? 1 : 0;

      if (aHighlighted !== bHighlighted) {
        return bHighlighted - aHighlighted;
      }

      return new Date(b.linkedAt).getTime() - new Date(a.linkedAt).getTime();
    });
  }, [children, highlightedStudentId]);

  // Don't render if not a parent
  if (userRole && userRole !== "parent") {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Children</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowPinModal(true)}
          >
            <IconSymbol name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Children List */}
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={Brand.primary} />
        ) : isError ? (
          <View style={styles.emptyState}>
            <IconSymbol name="exclamationmark.triangle.fill" size={64} color="#F59E0B" />
            <Text style={styles.emptyTitle}>Failed to Load Children</Text>
            <Text style={styles.emptySubtitle}>
              {(error as Error)?.message || "Please try again."}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sortedChildren.length > 0 ? (
          sortedChildren.map((child) => {
            const isHighlightedChild =
              !!highlightedStudentId && child.studentId === highlightedStudentId;

            const sortedRegistrations = [...child.registrations].sort((a, b) => {
              const aHighlighted =
                !!highlightedCompId && a.competitionId === highlightedCompId ? 1 : 0;
              const bHighlighted =
                !!highlightedCompId && b.competitionId === highlightedCompId ? 1 : 0;

              if (aHighlighted !== bHighlighted) {
                return bHighlighted - aHighlighted;
              }

              return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
            });

            return (
            <View
              key={child.linkId}
              style={[styles.childCard, isHighlightedChild && styles.childCardHighlighted]}
            >
              {/* Child Header */}
              <View style={styles.childHeader}>
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>
                    {child.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.fullName}</Text>
                  <Text style={styles.childDetails}>
                    {child.linkStatus === "pending" ? "Waiting for student approval" : `Grade ${child.grade} • ${child.school || "No school"}`}
                  </Text>
                  {child.email && (
                    <Text style={styles.childEmail}>{child.email}</Text>
                  )}
                </View>
                {getStatusBadge(child.linkStatus)}
              </View>

              {isHighlightedChild && (
                <View style={styles.highlightBanner}>
                  <Text style={styles.highlightBannerText}>
                    Opened from notification
                  </Text>
                </View>
              )}

              {/* Registrations */}
              <View style={styles.registrationsSection}>
                <Text style={styles.sectionTitle}>
                  Registrations ({child.registrations.length})
                </Text>

                {sortedRegistrations.length === 0 ? (
                  <Text style={styles.emptyText}>No registrations yet</Text>
                ) : (
                  sortedRegistrations.map((reg) => {
                    const isHighlightedReg =
                      !!highlightedCompId && reg.competitionId === highlightedCompId;

                    return (
                    <View
                      key={reg.registrationId}
                      style={[styles.regCard, isHighlightedReg && styles.regCardHighlighted]}
                    >
                      <View style={styles.regInfo}>
                        <Text style={styles.regName}>{reg.competitionName}</Text>
                        <Text style={styles.regCategory}>
                          {reg.category} • {reg.level}
                        </Text>
                        <Text style={styles.regDate}>
                          Registered: {new Date(reg.registeredAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {getStatusBadge(reg.status)}
                    </View>
                  );
                  })
                )}
              </View>
            </View>
          );
          })
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="person.2.fill" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Linked Children</Text>
            <Text style={styles.emptySubtitle}>
              Ask your child to send you an invitation, then tap the + button to enter the PIN code.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* PIN Entry Modal */}
      <Modal
        visible={showPinModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter PIN Code</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter your email and the 6-digit PIN code sent by your child
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Your email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="6-digit PIN"
              placeholderTextColor="#94A3B8"
              value={pin}
              onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                acceptInvitationMutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleAcceptInvitation}
              disabled={acceptInvitationMutation.isPending}
            >
              {acceptInvitationMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginTop: 40,
  },
  childCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  childCardHighlighted: {
    borderWidth: 2,
    borderColor: "#818CF8",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  childAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  childDetails: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 2,
  },
  childEmail: {
    fontSize: 12,
    color: "#94A3B8",
  },
  registrationsSection: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 16,
  },
  highlightBanner: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  highlightBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 12,
  },
  regCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    marginBottom: 8,
  },
  regCardHighlighted: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  regInfo: {
    flex: 1,
    marginRight: 8,
  },
  regName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  regCategory: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 2,
  },
  regDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "uppercase",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginVertical: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: Brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
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
  submitButton: {
    backgroundColor: Brand.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
