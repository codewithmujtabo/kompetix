import { AppInput } from "@/components/common/AppInput";
import * as userService from "@/services/user.service";
import { Brand } from "@/constants/theme";
import React, {
    useEffect,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  school: string;
  grade?: string;
  nisn?: string;
  photo_url?: string;
  city: string;
  role: string;
}

export default function ProfileCompletionScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] =
    useState<UserProfile | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);

  // Form state
  const [nisn, setNisn] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await userService.getProfile();

      if (!data) return;

      setProfile({
        id: data.id,
        full_name: data.fullName || "",
        phone: data.phone || "",
        school: data.school || "",
        grade: data.grade,
        nisn: data.nisn,
        photo_url: data.photoUrl,
        city: data.city || "",
        role: data.role || "student",
      });
      setNisn(data.nisn || "");
      setCity(data.city || "");
    } catch (err) {
      console.error(
        "Error fetching profile:",
        err,
      );
      Alert.alert(
        "Error",
        "Failed to load profile",
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const e: Record<string, string> =
      {};
    if (nisn && nisn.length < 16) {
      e.nisn = "NISN must be 16 digits";
    }
    if (!city.trim()) {
      e.city = "City is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveProfile =
    async () => {
      if (!validateForm() || !profile)
        return;

      setSaving(true);
      try {
        await userService.updateProfile({
          nisn: nisn || null,
          city: city.trim(),
        });

        Alert.alert(
          "Success",
          "Profile updated!",
        );
        setProfile({
          ...profile,
          nisn,
          city,
        });
      } catch (err) {
        Alert.alert(
          "Error",
          "Failed to update profile",
        );
        console.error(err);
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center" },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={Brand.primary}
        />
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center" },
        ]}
      >
        <Text style={styles.errorText}>
          Failed to load profile
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + 20,
          paddingBottom:
            insets.bottom + 24,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View
          style={styles.profilePhotoBox}
        >
          {profile.photo_url ? (
            <Image
              source={{
                uri: profile.photo_url,
              }}
              style={
                styles.profilePhoto
              }
            />
          ) : (
            <Text
              style={
                styles.profilePhotoPlaceholder
              }
            >
              {profile.full_name
                ?.charAt(0)
                .toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.title}>
          Complete Your Profile
        </Text>
        <Text style={styles.subtitle}>
          Add more information so
          organizers can verify your
          identity.
        </Text>
      </View>

      {/* Current Info (Read-only) */}
      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
        >
          Current Information
        </Text>

        <View style={styles.infoBox}>
          <Text
            style={styles.infoLabel}
          >
            Name
          </Text>
          <Text
            style={styles.infoValue}
          >
            {profile.full_name}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text
            style={styles.infoLabel}
          >
            Phone
          </Text>
          <Text
            style={styles.infoValue}
          >
            {profile.phone}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text
            style={styles.infoLabel}
          >
            School
          </Text>
          <Text
            style={styles.infoValue}
          >
            {profile.school}
          </Text>
        </View>

        {profile.grade && (
          <View style={styles.infoBox}>
            <Text
              style={styles.infoLabel}
            >
              Grade
            </Text>
            <Text
              style={styles.infoValue}
            >
              {profile.grade}
            </Text>
          </View>
        )}
      </View>

      {/* Editable Fields */}
      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
        >
          Additional Information
        </Text>

        <AppInput
          label="NISN (National Student ID)"
          placeholder="e.g. 1234567890123456"
          value={nisn}
          onChangeText={setNisn}
          keyboardType="number-pad"
          error={errors.nisn}
          maxLength={16}
        />

        <AppInput
          label="City"
          placeholder="e.g. Jakarta"
          value={city}
          onChangeText={setCity}
          error={errors.city}
          autoCapitalize="words"
        />
      </View>

      {/* Note */}
      <View style={styles.noteBox}>
        <Text style={styles.noteEmoji}>
          ℹ️
        </Text>
        <Text style={styles.noteText}>
          This information helps
          organizers verify your
          eligibility for competitions.
          You can update it anytime from
          your profile.
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          saving &&
            styles.primaryButtonDisabled,
        ]}
        onPress={handleSaveProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Save Changes
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  profilePhotoBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor:
      Brand.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  profilePhoto: {
    width: "100%",
    height: "100%",
  },
  profilePhotoPlaceholder: {
    fontSize: 32,
    fontWeight: "700",
    color: Brand.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  infoBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  noteBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    marginBottom: 24,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  noteEmoji: {
    fontSize: 16,
  },
  noteText: {
    fontSize: 12,
    color: "#1976d2",
    lineHeight: 16,
    flex: 1,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Brand.primary,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
  },
});
