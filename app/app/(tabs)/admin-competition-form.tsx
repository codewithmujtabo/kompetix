import { Brand } from "@/constants/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as adminService from "@/services/admin.service";
import * as competitionsService from "@/services/competitions.service";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Round {
  roundName: string;
  roundType: "Online" | "On-site" | "Hybrid";
  startDate: string;
  registrationDeadline: string;
  examDate: string;
  resultsDate: string;
  fee: string;
  location: string;
}

export default function AdminCompetitionFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const goBackToAdminCompetitions = () => {
    router.replace("/(tabs)/admin-competitions");
  };

  const [name, setName] = useState("");
  const [organizerName, setOrganizerName] = useState("Eduversal");
  const [category, setCategory] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [description, setDescription] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [participantInstructions, setParticipantInstructions] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState<"On Going" | "Closed" | "Coming Soon">("Coming Soon");
  const [isInternational, setIsInternational] = useState(false);
  const [fee, setFee] = useState("0");
  const [quota, setQuota] = useState("");
  const [rounds, setRounds] = useState<Round[]>([
    {
      roundName: "Round 1",
      roundType: "Online",
      startDate: "",
      registrationDeadline: "",
      examDate: "",
      resultsDate: "",
      fee: "0",
      location: "",
    },
  ]);

  // Fetch existing competition if editing
  const { data: existingComp, isLoading: loadingComp } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => competitionsService.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingComp) {
      setName(existingComp.name || "");
      setOrganizerName(existingComp.organizerName || "Eduversal");
      setCategory(existingComp.category || "");
      setGradeLevel(existingComp.gradeLevel || "");
      setDescription(existingComp.description || "");
      setDetailedDescription(existingComp.detailedDescription || "");
      setParticipantInstructions(existingComp.participantInstructions || "");
      setWebsiteUrl(existingComp.websiteUrl || "");
      setRegistrationStatus(
        (existingComp.registrationStatus as "Coming Soon" | "On Going" | "Closed") ||
          "Coming Soon"
      );
      setIsInternational(existingComp.isInternational || false);
      setFee(String(existingComp.fee || 0));
      setQuota(String(existingComp.quota || ""));
      if (existingComp.rounds && existingComp.rounds.length > 0) {
        setRounds(
          existingComp.rounds.map((round) => ({
            roundName: round.roundName,
            roundType: round.roundType,
            startDate: round.startDate || "",
            registrationDeadline: round.registrationDeadline || "",
            examDate: round.examDate || "",
            resultsDate: round.resultsDate || "",
            fee: String(round.fee || 0),
            location: round.location || "",
          }))
        );
      }
    }
  }, [existingComp]);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? adminService.updateCompetition(id!, data)
        : adminService.createCompetition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCompetitions"] });
      Alert.alert("Success", `Competition ${isEdit ? "updated" : "created"} successfully`);
      goBackToAdminCompetitions();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || `Failed to ${isEdit ? "update" : "create"} competition`);
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Competition name is required");
      return;
    }

    const data = {
      name,
      organizerName,
      category,
      gradeLevel,
      description,
      detailedDescription,
      participantInstructions,
      websiteUrl,
      registrationStatus,
      isInternational,
      fee: parseInt(fee) || 0,
      quota: quota ? parseInt(quota) : undefined,
      rounds: rounds.map((r) => ({
        roundName: r.roundName,
        roundType: r.roundType,
        startDate: r.startDate || undefined,
        registrationDeadline: r.registrationDeadline || undefined,
        examDate: r.examDate || undefined,
        resultsDate: r.resultsDate || undefined,
        fee: parseInt(r.fee) || 0,
        location: r.location || undefined,
      })),
    };

    saveMutation.mutate(data);
  };

  const addRound = () => {
    setRounds([
      ...rounds,
      {
        roundName: `Round ${rounds.length + 1}`,
        roundType: "Online",
        startDate: "",
        registrationDeadline: "",
        examDate: "",
        resultsDate: "",
        fee: "0",
        location: "",
      },
    ]);
  };

  const removeRound = (index: number) => {
    if (rounds.length === 1) {
      Alert.alert("Error", "At least one round is required");
      return;
    }
    setRounds(rounds.filter((_, i) => i !== index));
  };

  const updateRound = (index: number, field: keyof Round, value: string) => {
    const updated = [...rounds];
    updated[index] = { ...updated[index], [field]: value };
    setRounds(updated);
  };

  if (loadingComp) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={goBackToAdminCompetitions}>
          <IconSymbol name="chevron.left" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? "Edit" : "Add"} Competition</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <Text style={styles.label}>Competition Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., STEM Olympiad 2026"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Organizer</Text>
        <TextInput
          style={styles.input}
          value={organizerName}
          onChangeText={setOrganizerName}
          placeholder="Organizer name"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="e.g., Mathematics, Science"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Grade Level</Text>
        <TextInput
          style={styles.input}
          value={gradeLevel}
          onChangeText={setGradeLevel}
          placeholder="e.g., 7-12 or SD, SMP, SMA"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Short description"
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Detailed Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={detailedDescription}
          onChangeText={setDetailedDescription}
          placeholder="Detailed information about the competition"
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Participant Instructions</Text>
        <TextInput
          style={[styles.input, styles.textAreaLarge]}
          value={participantInstructions}
          onChangeText={setParticipantInstructions}
          placeholder="What approved students should know: website, venue, arrival time, what to bring, briefing notes, contact person..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={7}
        />

        <Text style={styles.label}>Website URL</Text>
        <TextInput
          style={styles.input}
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://..."
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Registration Status</Text>
        <View style={styles.statusButtons}>
          {(["Coming Soon", "On Going", "Closed"] as const).map((status) => (
            <Pressable
              key={status}
              style={[
                styles.statusButton,
                registrationStatus === status && styles.statusButtonActive,
              ]}
              onPress={() => setRegistrationStatus(status)}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  registrationStatus === status && styles.statusButtonTextActive,
                ]}
              >
                {status}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>International Competition</Text>
          <Switch
            value={isInternational}
            onValueChange={setIsInternational}
            trackColor={{ false: "#E2E8F0", true: Brand.primary }}
          />
        </View>

        <Text style={styles.label}>Base Fee (Rp)</Text>
        <TextInput
          style={styles.input}
          value={fee}
          onChangeText={setFee}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Quota (optional)</Text>
        <TextInput
          style={styles.input}
          value={quota}
          onChangeText={setQuota}
          placeholder="Leave empty for unlimited"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Competition Rounds</Text>
          <Pressable style={styles.addRoundButton} onPress={addRound}>
            <IconSymbol name="plus.circle.fill" size={20} color={Brand.primary} />
            <Text style={styles.addRoundText}>Add Round</Text>
          </Pressable>
        </View>

        {rounds.map((round, index) => (
          <View key={index} style={styles.roundCard}>
            <View style={styles.roundHeader}>
              <Text style={styles.roundTitle}>Round {index + 1}</Text>
              {rounds.length > 1 && (
                <Pressable onPress={() => removeRound(index)}>
                  <IconSymbol name="trash" size={18} color="#EF4444" />
                </Pressable>
              )}
            </View>

            <Text style={styles.label}>Round Name</Text>
            <TextInput
              style={styles.input}
              value={round.roundName}
              onChangeText={(val) => updateRound(index, "roundName", val)}
              placeholder="e.g., Preliminary Round"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Round Type</Text>
            <View style={styles.typeButtons}>
              {(["Online", "On-site", "Hybrid"] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeButton,
                    round.roundType === type && styles.typeButtonActive,
                  ]}
                  onPress={() => updateRound(index, "roundType", type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      round.roundType === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Fee (Rp)</Text>
            <TextInput
              style={styles.input}
              value={round.fee}
              onChangeText={(val) => updateRound(index, "fee", val)}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Location (optional)</Text>
            <TextInput
              style={styles.input}
              value={round.location}
              onChangeText={(val) => updateRound(index, "location", val)}
              placeholder="e.g., Jakarta Convention Center"
              placeholderTextColor="#94A3B8"
            />
          </View>
        ))}

        <Pressable
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{isEdit ? "Update" : "Create"} Competition</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: "#0F172A",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  textAreaLarge: { height: 140, textAlignVertical: "top" },
  statusButtons: { flexDirection: "row", gap: 8 },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  statusButtonActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  statusButtonText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  statusButtonTextActive: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  addRoundButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  addRoundText: { fontSize: 14, fontWeight: "700", color: Brand.primary },
  roundCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roundHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roundTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  typeButtons: { flexDirection: "row", gap: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  typeButtonText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  typeButtonTextActive: { color: "#fff" },
  saveButton: {
    backgroundColor: Brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
