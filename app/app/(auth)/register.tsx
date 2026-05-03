import { AppInput } from "@/components/common/AppInput";
import { AppAutocomplete } from "@/components/common/AppAutocomplete";
import * as authService from "@/services/auth.service";
import * as regionsService from "@/services/regions.service";
import * as schoolsService from "@/services/schools.service";
import { Brand } from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROLES = [
  {
    id: "student",
    label: "Student",
    emoji: "🎒",
  },
  {
    id: "parent",
    label: "Parent",
    emoji: "👨‍👧",
  },
  {
    id: "teacher",
    label: "Teacher",
    emoji: "📖",
  },
] as const;

type Role =
  (typeof ROLES)[number]["id"];

const GRADES = [
  "1", "2", "3", "4", "5", "6",  // SD (Elementary)
  "7", "8", "9",                   // SMP (Junior High)
  "10", "11", "12"                 // SMA (Senior High)
] as const;
type Grade = (typeof GRADES)[number];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fetchUser } = useUser();

  // Step 1: Role selection, Step 2: Details, Step 3: Consent
  const [step, setStep] = useState<
    "role" | "details" | "consent"
  >("role");
  const [consentChecked, setConsentChecked] = useState(false);
  const [role, setRole] =
    useState<Role>("student");

  // Common fields
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] =
    useState("");
  const [province, setProvince] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [city, setCity] = useState("");
  const [regencyCode, setRegencyCode] = useState("");

  // Student specific
  const [school, setSchool] =
    useState("");
  const [schoolNpsn, setSchoolNpsn] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [grade, setGrade] =
    useState<Grade>("7");

  // Parent specific
  const [childName, setChildName] =
    useState("");
  const [childSchool, setChildSchool] =
    useState("");
  const [childGrade, setChildGrade] =
    useState<Grade>("7");

  // Teacher specific
  const [
    teacherSchool,
    setTeacherSchool,
  ] = useState("");
  const [subject, setSubject] =
    useState("");

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] =
    useState(false);

  // Autocomplete data
  const [provincesList, setProvincesList] = useState<regionsService.Province[]>([]);
  const [citiesList, setCitiesList] = useState<regionsService.Regency[]>([]);

  // Load provinces on mount
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const provinces = await regionsService.getProvinces();
        setProvincesList(provinces);
      } catch (error) {
        console.error("Failed to load provinces:", error);
      }
    };
    loadProvinces();
  }, []);

  // Load cities when province changes
  useEffect(() => {
    if (!provinceCode) {
      setCitiesList([]);
      return;
    }

    const loadCities = async () => {
      try {
        const cities = await regionsService.getRegencies(provinceCode);
        setCitiesList(cities);
      } catch (error) {
        console.error("Failed to load cities:", error);
      }
    };
    loadCities();
  }, [provinceCode]);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateDetails = () => {
    const e: Record<string, string> =
      {};

    // Common validations
    if (!name.trim())
      e.name = "Full name is required";
    else if (name.trim().length < 3)
      e.name =
        "Name must be at least 3 characters";

    if (!email.trim())
      e.email = "Email is required";
    else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    )
      e.email = "Enter a valid email";

    if (!password)
      e.password =
        "Password is required";
    else if (password.length < 6)
      e.password =
        "Password must be at least 6 characters";

    if (!phone.trim())
      e.phone =
        "Phone number is required";
    else if (
      phone.replace(/\D/g, "").length <
      9
    )
      e.phone =
        "Enter a valid phone number";

    if (!province.trim())
      e.province = "Province is required";

    if (!city.trim())
      e.city = "City is required";

    // Role-specific validations
    if (role === "student") {
      if (!schoolNpsn || !school.trim())
        e.school =
          "Please enter your school NPSN";
      if (!grade)
        e.grade =
          "Grade level is required";
    } else if (role === "parent") {
      if (!childName.trim())
        e.childName =
          "Child's name is required";
      if (!childSchool.trim())
        e.childSchool =
          "Please enter child's school NPSN";
      if (!childGrade)
        e.childGrade =
          "Child's grade is required";
    } else if (role === "teacher") {
      if (!teacherSchool.trim())
        e.teacherSchool =
          "Please enter your school NPSN";
      if (!subject.trim())
        e.subject =
          "Subject is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Registration Handler ───────────────────────────────────────────────────

  const handleCreateAccount =
    async () => {
      if (!consentChecked) {
        Alert.alert("Consent Required", "You must agree to the privacy policy to continue.");
        return;
      }

      setLoading(true);
      try {
        // Build role-specific data
        let roleData: any = {};
        if (role === "student") {
          roleData = {
            school: school.trim(),
            grade,
            npsn: schoolNpsn || null,
            schoolAddress: schoolAddress || null,
          };
        } else if (role === "parent") {
          roleData = {
            childName: childName.trim(),
            childSchool: childSchool.trim(),
            childGrade,
          };
        } else if (role === "teacher") {
          roleData = {
            school: teacherSchool.trim(),
            subject: subject.trim(),
          };
        }

        // Single API call handles everything
        const { user } =
          await authService.signup({
            email: email.trim(),
            password: password.trim(),
            fullName: name.trim(),
            phone: phone.trim(),
            city: city.trim(),
            province: province.trim(),
            role,
            roleData,
            consentAccepted: true,
          });

        Alert.alert(
          "Success",
          "Account created! Welcome to Kompetix",
        );

        if (user?.id) {
          await fetchUser(user.id);
        }

        // Navigate to role-specific screen
        const userRole = user?.role || role;
        if (userRole === "admin") {
          router.replace("/(tabs)/web-portal-redirect");
        } else if (userRole === "teacher") {
          router.replace("/(tabs)/teacher-dashboard");
        } else if (userRole === "parent") {
          router.replace("/(tabs)/children");
        } else if (userRole === "school_admin") {
          router.replace("/(tabs)/profile");
        } else {
          router.replace("/(tabs)/competitions");
        }
      } catch (err: any) {
        console.error(
          "Registration error:",
          err,
        );
        const msg = err?.message?.toLowerCase() || "";
        if (msg.includes("already registered") || msg.includes("already")) {
          Alert.alert(
            "Account Exists",
            "This email is already registered. Please login instead.",
          );
        } else if (msg.includes("rate limit")) {
          Alert.alert(
            "Rate Limit",
            "Too many signups. Wait 2 minutes and try again.",
          );
        } else {
          Alert.alert(
            "Error",
            err?.message || "Registration failed",
          );
        }
      } finally {
        setLoading(false);
      }
    };

  // ─── Step 1: Role Selection ─────────────────────────────────────────────────

  if (step === "role") {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 20,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.roleBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.roleBackText}>← Back to Login</Text>
          </TouchableOpacity>

          <View
            style={styles.roleHeader}
          >
            <Text
              style={styles.roleTitle}
            >
              Choose Your Role
            </Text>
            <Text
              style={
                styles.roleSubtitle
              }
            >
              Select how you'll use
              Kompetix
            </Text>
          </View>

          <View
            style={
              styles.rolesContainer
            }
          >
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.roleCard,
                  role === r.id &&
                    styles.roleCardActive,
                ]}
                onPress={() =>
                  setRole(r.id)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={
                    styles.roleEmoji
                  }
                >
                  {r.emoji}
                </Text>
                <Text
                  style={[
                    styles.roleLabel,
                    role === r.id &&
                      styles.roleLabelActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={
              styles.roleDescription
            }
          >
            {role === "student" && (
              <Text
                style={
                  styles.descriptionText
                }
              >
                Discover and register
                for competitions
                tailored to your
                academic level.
              </Text>
            )}
            {role === "parent" && (
              <Text
                style={
                  styles.descriptionText
                }
              >
                Help your child find and
                participate in
                competitions.
              </Text>
            )}
            {role === "teacher" && (
              <Text
                style={
                  styles.descriptionText
                }
              >
                Encourage your students
                to participate in
                academic competitions.
              </Text>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() =>
            setStep("details")
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.continueBtnText
            }
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Step 3: Consent ────────────────────────────────────────────────────────

  if (step === "consent") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}>
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔐</Text>
            <Text style={[styles.stepTitle, { textAlign: "center" }]}>
              Privacy Policy
            </Text>
            <Text style={{ color: "#64748B", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
              Before creating an account, please read and agree to the following terms.
            </Text>
          </View>

          <View style={styles.consentBox}>
            <Text style={styles.consentTitle}>Data we collect</Text>
            <Text style={styles.consentBody}>
              • Profile & identity (name, email, phone number, city){"\n"}
              • Education data (school, grade, scores — for parents/teachers){"\n"}
              • Documents you upload (report cards, certificates, photos){"\n"}
              • App usage activity (competitions viewed & registered)
            </Text>

            <Text style={[styles.consentTitle, { marginTop: 16 }]}>How data is used</Text>
            <Text style={styles.consentBody}>
              • Display relevant competitions for you{"\n"}
              • Process competition registrations & payments{"\n"}
              • Send important notifications related to competitions{"\n"}
              • Improve the quality of Kompetix services
            </Text>

            <Text style={[styles.consentTitle, { marginTop: 16 }]}>Data security</Text>
            <Text style={styles.consentBody}>
              Your data is stored securely and is not sold to third parties.
              In accordance with the Personal Data Protection Law (Law No. 27 of 2022),
              you can request data deletion by contacting our team.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setConsentChecked((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
              {consentChecked && <Text style={{ color: "#fff", fontWeight: "800" }}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>
              I have read and agree to the{" "}
              <Text
                style={{ color: Brand.primary, textDecorationLine: "underline" }}
                onPress={() => Linking.openURL("https://kompetix.id/privacy")}
              >
                Privacy Policy
              </Text>{" "}
              of Kompetix.
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.footerButtons, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep("details")}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerBtn, (!consentChecked || loading) && styles.registerBtnDisabled]}
            onPress={handleCreateAccount}
            disabled={!consentChecked || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Step 2: Details Collection ─────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      style={[
        styles.container,
        { paddingTop: insets.top },
      ]}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              setStep("role")
            }
            style={styles.backBtn}
          >
            <Text
              style={styles.backBtnText}
            >
              ← Back
            </Text>
          </TouchableOpacity>
          <Text
            style={styles.stepTitle}
          >
            Complete Your Profile
          </Text>
        </View>

        {/* Common Fields */}
        <View style={styles.section}>
          <Text
            style={styles.sectionLabel}
          >
            Basic Information
          </Text>

          <AppInput
            label="Full Name"
            placeholder="e.g. John Doe"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />

          <AppInput
            label="Email"
            placeholder="e.g. john@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <AppInput
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <AppInput
            label="Phone Number"
            placeholder="e.g. 08123456789"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={errors.phone}
          />

          <AppAutocomplete
            label="Province"
            placeholder="Select your province"
            value={province}
            onChangeText={setProvince}
            onSelect={(item) => {
              setProvince(item.name);
              setProvinceCode(item.id);
              // Reset city when province changes
              setCity("");
              setRegencyCode("");
            }}
            fetchSuggestions={async (query) => {
              if (!query || query.trim().length === 0) {
                // Return all provinces for dropdown
                return provincesList.slice(0, 20).map((prov) => ({
                  id: prov.code,
                  name: prov.name,
                }));
              }
              const lowerQuery = query.toLowerCase();
              return provincesList
                .filter((prov) => prov.name.toLowerCase().includes(lowerQuery))
                .slice(0, 10)
                .map((prov) => ({
                  id: prov.code,
                  name: prov.name,
                }));
            }}
            error={errors.province}
            minSearchLength={0}
            allowCustom={false}
            autoCapitalize="characters"
          />

          <AppAutocomplete
            label="City / Kabupaten"
            placeholder={provinceCode ? "Select your city" : "Select province first"}
            value={city}
            onChangeText={setCity}
            onSelect={(item) => {
              setCity(item.name);
              setRegencyCode(item.id);
            }}
            fetchSuggestions={async (query) => {
              if (!provinceCode) {
                return [];
              }
              if (!query || query.trim().length === 0) {
                // Return all cities for this province
                return citiesList.slice(0, 20).map((regency) => ({
                  id: regency.code,
                  name: regency.name,
                }));
              }
              const lowerQuery = query.toLowerCase();
              return citiesList
                .filter((regency) => regency.name.toLowerCase().includes(lowerQuery))
                .slice(0, 10)
                .map((regency) => ({
                  id: regency.code,
                  name: regency.name,
                }));
            }}
            error={errors.city}
            minSearchLength={0}
            allowCustom={false}
            editable={!!provinceCode}
            autoCapitalize="characters"
          />
        </View>

        {/* Student-specific fields */}
        {role === "student" && (
          <View style={styles.section}>
            <Text
              style={
                styles.sectionLabel
              }
            >
              Student Information
            </Text>

            <AppAutocomplete
              label="NPSN (School ID)"
              placeholder={regencyCode ? "Enter school NPSN" : "Select city first"}
              value={school}
              onChangeText={setSchool}
              onSelect={(item) => {
                setSchool(item.name);
                setSchoolNpsn(item.metadata?.npsn || "");
                setSchoolAddress(item.metadata?.address || "");
              }}
              fetchSuggestions={async (query) => {
                if (!regencyCode) {
                  return [];
                }
                if (!query || query.trim().length === 0) {
                  const schools = await schoolsService.searchSchools({
                    regencyCode,
                    grade,
                    page: 1,
                  });
                  return schools.slice(0, 20).map((school) => ({
                    id: school.npsn || school.id,
                    name: `${school.npsn ? `${school.npsn} - ` : ''}${school.name}`,
                    metadata: {
                      npsn: school.npsn,
                      address: school.address,
                    },
                  }));
                }
                if (query.trim().length < 3) {
                  return [];
                }
                const schools = await schoolsService.searchSchools({
                  name: query,
                  regencyCode: regencyCode,
                  grade: grade,
                });
                return schools.map((school) => ({
                  id: school.npsn || school.id,
                  name: `${school.npsn ? `${school.npsn} - ` : ''}${school.name}`,
                  metadata: {
                    npsn: school.npsn,
                    address: school.address,
                  },
                }));
              }}
              error={errors.school}
              minSearchLength={3}
              debounceMs={500}
              allowCustom={false}
              customLabel="My school is not listed"
              editable={!!regencyCode}
              autoCapitalize="characters"
            />

            {schoolNpsn && (
              <View style={styles.npsnBadge}>
                <Text style={styles.npsnLabel}>✓ NPSN Verified:</Text>
                <Text style={styles.npsnValue}>{schoolNpsn}</Text>
              </View>
            )}

            <View
              style={styles.formGroup}
            >
              <Text
                style={styles.label}
              >
                Grade Level
              </Text>
              <View
                style={
                  styles.gradeSections
                }
              >
                {/* SD Grades 1-6 */}
                <View>
                  <Text style={styles.gradeGroupLabel}>SD (Elementary)</Text>
                  <View style={styles.gradeButtons}>
                    {["1", "2", "3", "4", "5", "6"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.gradeBtn,
                          grade === g &&
                            styles.gradeBtnActive,
                        ]}
                        onPress={() =>
                          setGrade(g as Grade)
                        }
                      >
                        <Text
                          style={[
                            styles.gradeBtnText,
                            grade === g &&
                              styles.gradeBtnTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* SMP Grades 7-9 */}
                <View>
                  <Text style={styles.gradeGroupLabel}>SMP (Junior High)</Text>
                  <View style={styles.gradeButtons}>
                    {["7", "8", "9"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.gradeBtn,
                          grade === g &&
                            styles.gradeBtnActive,
                        ]}
                        onPress={() =>
                          setGrade(g as Grade)
                        }
                      >
                        <Text
                          style={[
                            styles.gradeBtnText,
                            grade === g &&
                              styles.gradeBtnTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* SMA Grades 10-12 */}
                <View>
                  <Text style={styles.gradeGroupLabel}>SMA (Senior High)</Text>
                  <View style={styles.gradeButtons}>
                    {["10", "11", "12"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.gradeBtn,
                          grade === g &&
                            styles.gradeBtnActive,
                        ]}
                        onPress={() =>
                          setGrade(g as Grade)
                        }
                      >
                        <Text
                          style={[
                            styles.gradeBtnText,
                            grade === g &&
                              styles.gradeBtnTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              {errors.grade && (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errors.grade}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Parent-specific fields */}
        {role === "parent" && (
          <View style={styles.section}>
            <Text
              style={
                styles.sectionLabel
              }
            >
              Child Information
            </Text>

            <AppInput
              label="Child's Full Name"
              placeholder="e.g. Jane Doe"
              value={childName}
              onChangeText={
                setChildName
              }
              error={errors.childName}
            />

            <AppAutocomplete
              label="Child's NPSN (School ID)"
              placeholder={regencyCode ? "Enter child's school NPSN" : "Select city first"}
              value={childSchool}
              onChangeText={setChildSchool}
              onSelect={(item) => setChildSchool(item.name)}
              fetchSuggestions={async (query) => {
                if (!regencyCode) {
                  return [];
                }
                if (!query || query.trim().length < 3) {
                  return [];
                }
                const schools = await schoolsService.searchSchools({
                  name: query,
                  regencyCode: regencyCode,
                });
                return schools.map((school) => ({
                  id: school.npsn || school.id,
                  name: `${school.npsn ? `${school.npsn} - ` : ''}${school.name}`,
                }));
              }}
              error={errors.childSchool}
              minSearchLength={3}
              debounceMs={500}
              allowCustom={false}
              customLabel="My child's school is not listed"
              editable={!!regencyCode}
              autoCapitalize="characters"
            />

            <View
              style={styles.formGroup}
            >
              <Text
                style={styles.label}
              >
                Child's Grade
              </Text>
              <View
                style={
                  styles.gradeSections
                }
              >
                {/* SD Grades 1-6 */}
                <View>
                  <Text style={styles.gradeGroupLabel}>SD (Elementary)</Text>
                  <View style={styles.gradeButtons}>
                    {["1", "2", "3", "4", "5", "6"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.gradeBtn,
                          childGrade === g &&
                            styles.gradeBtnActive,
                        ]}
                        onPress={() =>
                          setChildGrade(g as Grade)
                        }
                      >
                        <Text
                          style={[
                            styles.gradeBtnText,
                            childGrade === g &&
                              styles.gradeBtnTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* SMP Grades 7-9 */}
                <View>
                  <Text style={styles.gradeGroupLabel}>SMP (Junior High)</Text>
                  <View style={styles.gradeButtons}>
                    {["7", "8", "9"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.gradeBtn,
                          childGrade === g &&
                            styles.gradeBtnActive,
                        ]}
                        onPress={() =>
                          setChildGrade(g as Grade)
                        }
                      >
                        <Text
                          style={[
                            styles.gradeBtnText,
                            childGrade === g &&
                              styles.gradeBtnTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* SMA Grades 10-12 */}
                <View>
                  <Text style={styles.gradeGroupLabel}>SMA (Senior High)</Text>
                  <View style={styles.gradeButtons}>
                    {["10", "11", "12"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.gradeBtn,
                          childGrade === g &&
                            styles.gradeBtnActive,
                        ]}
                        onPress={() =>
                          setChildGrade(g as Grade)
                        }
                      >
                        <Text
                          style={[
                            styles.gradeBtnText,
                            childGrade === g &&
                              styles.gradeBtnTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              {errors.childGrade && (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errors.childGrade}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Teacher-specific fields */}
        {role === "teacher" && (
          <View style={styles.section}>
            <Text
              style={
                styles.sectionLabel
              }
            >
              Teaching Information
            </Text>

            <AppAutocomplete
              label="NPSN (School ID)"
              placeholder={regencyCode ? "Enter school NPSN" : "Select city first"}
              value={teacherSchool}
              onChangeText={setTeacherSchool}
              onSelect={(item) => setTeacherSchool(item.name)}
              fetchSuggestions={async (query) => {
                if (!regencyCode) {
                  return [];
                }
                if (!query || query.trim().length < 3) {
                  return [];
                }
                const schools = await schoolsService.searchSchools({
                  name: query,
                  regencyCode: regencyCode,
                });
                return schools.map((school) => ({
                  id: school.npsn || school.id,
                  name: `${school.npsn ? `${school.npsn} - ` : ''}${school.name}`,
                }));
              }}
              error={errors.teacherSchool}
              minSearchLength={3}
              debounceMs={500}
              allowCustom={false}
              customLabel="My school is not listed"
              editable={!!regencyCode}
              autoCapitalize="characters"
            />

            <AppInput
              label="Subject"
              placeholder="e.g. Mathematics"
              value={subject}
              onChangeText={setSubject}
              error={errors.subject}
            />
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footerButtons,
          {
            paddingBottom:
              insets.bottom + 16,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            setStep("role")
          }
          disabled={loading}
        >
          <Text
            style={styles.backBtnText}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.registerBtn,
            loading && styles.registerBtnDisabled,
          ]}
          onPress={() => {
            if (validateDetails()) setStep("consent");
          }}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.registerBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  // ─── Role Selection Screen ─────────────────────────────────────────────────
  roleBackBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  roleBackText: {
    fontSize: 15,
    fontWeight: "600",
    color: Brand.primary,
  },
  roleHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  roleTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  roleSubtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  rolesContainer: {
    flexDirection: "column",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  roleCardActive: {
    borderColor: Brand.primary,
    backgroundColor: "#EEF2FF",
  },
  roleEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  roleLabelActive: {
    color: Brand.primary,
  },
  roleDescription: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  continueBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  // ─── Details Screen ───────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtnText: {
    color: Brand.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
  },
  gradeSections: {
    gap: 16,
  },
  gradeGroupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  gradeButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  gradeBtn: {
    minWidth: 52,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  gradeBtnActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  gradeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  gradeBtnTextActive: {
    color: "#fff",
  },
  npsnBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  npsnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0369A1",
    marginRight: 6,
  },
  npsnValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0C4A6E",
  },
  footerButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
  registerBtn: {
    flex: 1,
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  // ─── Consent Screen ───────────────────────────────────────────────────────
  consentBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  consentTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  consentBody: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 21,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
  },
});
