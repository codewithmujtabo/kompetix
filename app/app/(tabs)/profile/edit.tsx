import { AppInput } from "@/components/common/AppInput";
import { Brand } from "@/constants/theme";
import { INTEREST_CATEGORIES } from "@/constants/interests";
import { useUser } from "@/context/AuthContext";
import * as usersService from "@/services/users.service";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper to format date from ISO/backend format to display format
function formatDateForDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    // Format as DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

// Helper to convert display format to backend format (YYYY-MM-DD)
function formatDateForBackend(dateStr: string): string {
  if (!dateStr) return "";
  // Accept DD/MM/YYYY or YYYY-MM-DD
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { user, fetchUser } = useUser();

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);

  // User fields
  const [fullName, setFullName] = useState((user as any)?.fullName || (user as any)?.name || "");
  const [phone, setPhone] = useState((user as any)?.phone || "");
  const [email, setEmail] = useState((user as any)?.email || "");
  const [city, setCity] = useState((user as any)?.city || "");
  const [photoUrl, setPhotoUrl] = useState((user as any)?.photoUrl || (user as any)?.avatarUrl || null);

  // Student details
  const [dateOfBirth, setDateOfBirth] = useState(formatDateForDisplay((user as any)?.dateOfBirth) || "");
  const [interests, setInterests] = useState((user as any)?.interests || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [otherInterest, setOtherInterest] = useState("");
  const [referralSource, setReferralSource] = useState((user as any)?.referralSource || "");
  const [studentCardUrl, setStudentCardUrl] = useState((user as any)?.studentCardUrl || null);

  // School details
  const [schoolName, setSchoolName] = useState((user as any)?.schoolName || (user as any)?.school || "");
  const [grade, setGrade] = useState((user as any)?.level || "");
  const [npsn, setNpsn] = useState((user as any)?.npsn || "");
  const [schoolAddress, setSchoolAddress] = useState((user as any)?.schoolAddress || "");
  const [schoolEmail, setSchoolEmail] = useState((user as any)?.schoolEmail || "");
  const [schoolWhatsapp, setSchoolWhatsapp] = useState((user as any)?.schoolWhatsapp || "");
  const [schoolPhone, setSchoolPhone] = useState((user as any)?.schoolPhone || "");

  // Supervisor details
  const [supervisorName, setSupervisorName] = useState((user as any)?.supervisorName || "");
  const [supervisorEmail, setSupervisorEmail] = useState((user as any)?.supervisorEmail || "");
  const [supervisorWhatsapp, setSupervisorWhatsapp] = useState((user as any)?.supervisorWhatsapp || "");
  const [supervisorPhone, setSupervisorPhone] = useState((user as any)?.supervisorPhone || "");
  const [supervisorSchoolId, setSupervisorSchoolId] = useState((user as any)?.supervisorSchoolId || "");

  // Parent details
  const [parentName, setParentName] = useState((user as any)?.parentName || "");
  const [parentOccupation, setParentOccupation] = useState((user as any)?.parentOccupation || "");
  const [parentWhatsapp, setParentWhatsapp] = useState((user as any)?.parentWhatsapp || "");
  const [parentPhone, setParentPhone] = useState((user as any)?.parentPhone || "");
  const [parentSchoolId, setParentSchoolId] = useState((user as any)?.parentSchoolId || "");

  // Update form fields when user data changes (after fetchUser)
  useEffect(() => {
    if (user) {
      const u = user as any;
      setFullName(u.fullName || u.name || "");
      setPhone(u.phone || "");
      setEmail(u.email || "");
      setCity(u.city || "");
      setPhotoUrl(u.photoUrl || u.avatarUrl || null);
      setDateOfBirth(formatDateForDisplay(u.dateOfBirth) || "");
      setInterests(u.interests || "");

      // Sprint 4, Track F (T18) - Parse existing interests
      if (u.interests) {
        const parsed = u.interests.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
        const matched: string[] = [];
        const unmatched: string[] = [];

        for (const interest of parsed) {
          if (INTEREST_CATEGORIES.includes(interest as any)) {
            matched.push(interest);
          } else {
            unmatched.push(interest);
          }
        }

        setSelectedInterests(matched);
        setOtherInterest(unmatched.join(", "));
      }

      setReferralSource(u.referralSource || "");
      setStudentCardUrl(u.studentCardUrl || null);
      setSchoolName(u.schoolName || u.school || "");
      setGrade(u.level || "");
      setNpsn(u.npsn || "");
      setSchoolAddress(u.schoolAddress || "");
      setSchoolEmail(u.schoolEmail || "");
      setSchoolWhatsapp(u.schoolWhatsapp || "");
      setSchoolPhone(u.schoolPhone || "");
      setSupervisorName(u.supervisorName || "");
      setSupervisorEmail(u.supervisorEmail || "");
      setSupervisorWhatsapp(u.supervisorWhatsapp || "");
      setSupervisorPhone(u.supervisorPhone || "");
      setSupervisorSchoolId(u.supervisorSchoolId || "");
      setParentName(u.parentName || "");
      setParentOccupation(u.parentOccupation || "");
      setParentWhatsapp(u.parentWhatsapp || "");
      setParentPhone(u.parentPhone || "");
      setParentSchoolId(u.parentSchoolId || "");
    }
  }, [user]);

  async function handlePickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setUploadingPhoto(true);
      try {
        const { photoUrl: newUrl } = await usersService.uploadPhoto(uri);
        setPhotoUrl(newUrl);
        Alert.alert("Success", "Profile photo updated successfully");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to upload photo");
      } finally {
        setUploadingPhoto(false);
      }
    }
  }

  async function handlePickStudentCard() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setUploadingCard(true);
      try {
        const { studentCardUrl: newUrl } = await usersService.uploadStudentCard(uri);
        setStudentCardUrl(newUrl);
        Alert.alert("Success", "Student card uploaded successfully");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to upload student card");
      } finally {
        setUploadingCard(false);
      }
    }
  }

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Error", "Full name is required");
      return;
    }

    // Sprint 4, Track F (T18) - Combine selected interests with other
    const allInterests = [...selectedInterests];
    if (otherInterest.trim()) {
      allInterests.push(otherInterest.trim());
    }
    const interestsString = allInterests.join(", ");

    setSaving(true);
    try {
      await usersService.updateProfile({
        fullName,
        phone,
        city,
        dateOfBirth: dateOfBirth ? formatDateForBackend(dateOfBirth) : undefined,
        interests: interestsString || undefined,
        referralSource: referralSource || undefined,
        schoolName: schoolName || undefined,
        grade: grade || undefined,
        npsn: npsn || undefined,
        schoolAddress: schoolAddress || undefined,
        schoolEmail: schoolEmail || undefined,
        schoolWhatsapp: schoolWhatsapp || undefined,
        schoolPhone: schoolPhone || undefined,
        supervisorName: supervisorName || undefined,
        supervisorEmail: supervisorEmail || undefined,
        supervisorWhatsapp: supervisorWhatsapp || undefined,
        supervisorPhone: supervisorPhone || undefined,
        supervisorSchoolId: supervisorSchoolId || undefined,
        parentName: parentName || undefined,
        parentOccupation: parentOccupation || undefined,
        parentWhatsapp: parentWhatsapp || undefined,
        parentPhone: parentPhone || undefined,
        parentSchoolId: parentSchoolId || undefined,
      });

      await fetchUser((user as any)?.id);
      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const initial = fullName.charAt(0).toUpperCase() || "?";
  const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace("/api", "") || "";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoWrapper}
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
          >
            {photoUrl ? (
              <Image
                source={{ uri: `${API_BASE}${photoUrl}` }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>{initial}</Text>
              </View>
            )}
            {uploadingPhoto && (
              <View style={styles.photoLoading}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Tap to change photo</Text>
        </View>

        {/* Student Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Details</Text>
          <AppInput
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
          />
          <AppInput
            label="Date of Birth"
            placeholder="DD/MM/YYYY (e.g., 15/01/2005)"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            keyboardType="numbers-and-punctuation"
          />
          <AppInput
            label="WhatsApp / Phone Number"
            placeholder="08xxx or +628xxx"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <AppInput
            label="Email"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={false}
          />
          {/* Sprint 4, Track F (T17) - Interest picker with chips */}
          <View>
            <Text style={styles.inputLabel}>Interests</Text>
            <View style={styles.interestChips}>
              {INTEREST_CATEGORIES.map((category) => {
                const isSelected = selectedInterests.includes(category);
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.interestChip,
                      isSelected && styles.interestChipSelected,
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedInterests(selectedInterests.filter((i) => i !== category));
                      } else {
                        setSelectedInterests([...selectedInterests, category]);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.interestChipText,
                        isSelected && styles.interestChipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <AppInput
              label="Other Interests (optional)"
              placeholder="e.g., Robotics, Gaming"
              value={otherInterest}
              onChangeText={setOtherInterest}
            />
          </View>
          <AppInput
            label="Referral"
            placeholder="How did you hear about us?"
            value={referralSource}
            onChangeText={setReferralSource}
          />
        </View>

        {/* Student Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Card</Text>
          {studentCardUrl ? (
            <View style={styles.cardPreview}>
              <Image
                source={{ uri: `${API_BASE}${studentCardUrl}` }}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.uploadBtn, uploadingCard && styles.uploadBtnDisabled]}
            onPress={handlePickStudentCard}
            disabled={uploadingCard}
          >
            {uploadingCard ? (
              <ActivityIndicator color={Brand.primary} size="small" />
            ) : (
              <Text style={styles.uploadBtnText}>
                {studentCardUrl ? "Change Student Card" : "Upload Student Card"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* School Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>School Details</Text>
          <AppInput
            label="School Name"
            placeholder="Enter school name"
            value={schoolName}
            onChangeText={setSchoolName}
          />
          <AppInput
            label="NPSN"
            placeholder="National School Number"
            value={npsn}
            onChangeText={setNpsn}
            keyboardType="number-pad"
          />
          <AppInput
            label="Address"
            placeholder="School address"
            value={schoolAddress}
            onChangeText={setSchoolAddress}
          />
          <AppInput
            label="Email"
            placeholder="School email"
            value={schoolEmail}
            onChangeText={setSchoolEmail}
            keyboardType="email-address"
          />
          <AppInput
            label="WhatsApp"
            placeholder="School WhatsApp number"
            value={schoolWhatsapp}
            onChangeText={setSchoolWhatsapp}
            keyboardType="phone-pad"
          />
          <AppInput
            label="Phone Number"
            placeholder="School phone number"
            value={schoolPhone}
            onChangeText={setSchoolPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Supervisor Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supervisor Details</Text>
          <AppInput
            label="Name"
            placeholder="Supervisor name"
            value={supervisorName}
            onChangeText={setSupervisorName}
          />
          <AppInput
            label="Email"
            placeholder="Supervisor email"
            value={supervisorEmail}
            onChangeText={setSupervisorEmail}
            keyboardType="email-address"
          />
          <AppInput
            label="WhatsApp"
            placeholder="Supervisor WhatsApp"
            value={supervisorWhatsapp}
            onChangeText={setSupervisorWhatsapp}
            keyboardType="phone-pad"
          />
          <AppInput
            label="Phone Number"
            placeholder="Supervisor phone number"
            value={supervisorPhone}
            onChangeText={setSupervisorPhone}
            keyboardType="phone-pad"
          />
          <AppInput
            label="School ID"
            placeholder="Supervisor school ID"
            value={supervisorSchoolId}
            onChangeText={setSupervisorSchoolId}
          />
        </View>

        {/* Parent Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parent Details</Text>
          <AppInput
            label="Name"
            placeholder="Parent name"
            value={parentName}
            onChangeText={setParentName}
          />
          <AppInput
            label="Occupation"
            placeholder="Parent occupation"
            value={parentOccupation}
            onChangeText={setParentOccupation}
          />
          <AppInput
            label="WhatsApp"
            placeholder="Parent WhatsApp"
            value={parentWhatsapp}
            onChangeText={setParentWhatsapp}
            keyboardType="phone-pad"
          />
          <AppInput
            label="Phone Number"
            placeholder="Parent phone number"
            value={parentPhone}
            onChangeText={setParentPhone}
            keyboardType="phone-pad"
          />
          <AppInput
            label="School ID"
            placeholder="Parent school ID"
            value={parentSchoolId}
            onChangeText={setParentSchoolId}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backBtn: { marginBottom: 12 },
  backBtnText: { fontSize: 14, color: Brand.primary, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A" },

  photoSection: { alignItems: "center", marginBottom: 32 },
  photoWrapper: { position: "relative" },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Brand.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  photoInitial: { fontSize: 40, fontWeight: "700", color: Brand.primary },
  photoLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#F8FAFC",
  },
  photoBadgeText: { fontSize: 14 },
  photoHint: { fontSize: 12, color: "#94A3B8", marginTop: 8 },

  section: { marginBottom: 24, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 4 },

  // Sprint 4, Track F (T17) - Interest chips
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  interestChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  interestChipSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  interestChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  interestChipTextSelected: {
    color: "#fff",
  },

  cardPreview: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardImage: { width: "100%", height: 200, borderRadius: 8 },

  uploadBtn: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Brand.primary,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { fontSize: 14, fontWeight: "600", color: Brand.primary },

  saveBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
