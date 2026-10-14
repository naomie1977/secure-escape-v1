import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors } from "@/utils/theme";
import { getProfileMe } from "@/services/profileService";
import { ProfileMeResponse } from "@/types/profile";
import { getEnrollmentStatus } from "@/services/secureEscapeService";
import { logout } from "@/services/authService";
import { uploadScreenRecordingEvidence } from "@/services/transactionServices";
import {
  clearCompletedScreenRecording,
  stopScreenRecording,
} from "@/modules/secure-escape-screen-recorder/src/SecureEscapeScreenRecorder";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const LINE = "#E9E8F0";
const PALE_PURPLE = "#F3F0FF";
const RED = "#B42332";
const PALE_RED = "#FFF0F0";

export default function SettingsScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileMeResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [openingSecureEscape, setOpeningSecureEscape] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const data = await getProfileMe();
        if (mounted) {
          setProfile(data);
        }
      } catch {
        if (mounted) {
          setError("Could not load your profile.");
        }
      } finally {
        if (mounted) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const showSecureEscape =
    !loadingProfile &&
    profile !== null &&
    profile.sessionMode !== "Duress";

  const handleSecureEscape = async () => {
    if (!showSecureEscape || openingSecureEscape) return;

    try {
      setOpeningSecureEscape(true);
      setError("");

      const enrollment = await getEnrollmentStatus();

      if (enrollment.status === "Active") {
        router.push("/secure-escape/manage-secure-escape");
        return;
      }

      if (enrollment.status === "NotConfigured" || !enrollment.hasDecoyProfile) {
        router.push("/secure-escape/intro");
        return;
      }

      if (!enrollment.hasDuressPin) {
        router.push("/secure-escape/duress-pin");
        return;
      }

      if (!enrollment.hasEmergencyContact) {
        router.push("/secure-escape/emergency-contact?from=onboarding");
        return;
      }

      router.push("/secure-escape/intro");
    } catch (err) {
      console.error("Failed to load Secure Escape enrollment:", err);
      Alert.alert(
        "Secure Escape",
        err instanceof Error
          ? err.message
          : "Unable to check your Secure Escape setup. Please try again."
      );
    } finally {
      setOpeningSecureEscape(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      setError("");

      try {
        const recording = await stopScreenRecording();

        if (recording.stopped && recording.uri) {
          await uploadScreenRecordingEvidence(recording.uri);
          clearCompletedScreenRecording();
        }
      } catch (evidenceError) {
        console.error(
          "Failed to finalize or upload screen-recording evidence:",
          evidenceError
        );
      }

      await logout();

      setTimeout(() => {
        router.replace("/(auth)");
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to log out. Please try again."
      );
      setLoggingOut(false);
    }
  };

  const fullName = profile?.fullName?.trim() || "";
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PURPLE HEADER */}
        <View style={styles.header}>
          <View style={styles.appBar}>
            <View style={styles.appBarSpacer} />
            <Text style={styles.appBarTitle}>Settings</Text>
            <View style={styles.appBarSpacer} />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerEyebrow}>YOUR ACCOUNT</Text>
            <Text style={styles.headerHeading}>Settings</Text>
            <Text style={styles.headerDescription}>
              Manage your personal information and account preferences.
            </Text>
          </View>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              {loadingProfile ? (
                <ActivityIndicator color={PURPLE} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileEyebrow}>SIGNED IN AS</Text>
              <Text style={styles.profileName} numberOfLines={2}>
                {loadingProfile
                  ? "Loading profileâ€¦"
                  : fullName || "Account holder"}
              </Text>
              <Text style={styles.profileSubtitle}>Your personal account</Text>
            </View>

            <Ionicons
              name="person-outline"
              size={19}
              color={colors.textSub}
            />
          </View>
        </View>

        {/* ACCOUNT SETTINGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.sectionDescription}>
            View and manage your account details.
          </Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push("/settings/profile-details")}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="My information"
            >
              <View style={styles.menuIcon}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={PURPLE}
                />
              </View>

              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>My information</Text>
                <Text style={styles.menuSubtitle}>
                  View and update your information
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSub}
              />
            </TouchableOpacity>

            {/* HIDDEN IN DURESS MODE */}
            {showSecureEscape && (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={handleSecureEscape}
                disabled={openingSecureEscape}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Secure Escape settings"
                accessibilityState={{
                  busy: openingSecureEscape,
                  disabled: openingSecureEscape,
                }}
              >
                <View style={styles.menuIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={PURPLE}
                  />
                </View>

                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>Secure Escape</Text>
                  <Text style={styles.menuSubtitle}>
                    {openingSecureEscape
                      ? "Checking Secure Escape status..."
                      : "Manage your duress PIN and setup"}
                  </Text>
                </View>

                {openingSecureEscape ? (
                  <ActivityIndicator size="small" color={PURPLE} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textSub}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SESSION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session</Text>
          <Text style={styles.sectionDescription}>
            Sign out of your account on this device.
          </Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[
                styles.menuRow,
                loggingOut && styles.disabledRow,
              ]}
              onPress={handleLogout}
              disabled={loggingOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              accessibilityState={{
                busy: loggingOut,
                disabled: loggingOut,
              }}
            >
              <View style={styles.logoutIcon}>
                <Ionicons name="log-out-outline" size={20} color={RED} />
              </View>

              <View style={styles.menuText}>
                <Text style={styles.logoutTitle}>Log out</Text>
                <Text style={styles.menuSubtitle}>
                  Sign out of your account
                </Text>
              </View>

              {loggingOut ? (
                <ActivityIndicator size="small" color={RED} />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSub}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ERROR */}
        {!!error && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={19} color={RED} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.footerText}>SecureEscape</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 44,
  },

  // HEADER
  header: {
    backgroundColor: PURPLE,
  },

  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 8 : 56,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },

  appBarSpacer: {
    width: 44,
    height: 44,
  },

  appBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: WHITE,
    textAlign: "center",
  },

  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },

  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E4E1FF",
    letterSpacing: 0.7,
    marginBottom: 10,
  },

  headerHeading: {
    fontSize: 29,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  headerDescription: {
    fontSize: 13,
    color: "#E4E1FF",
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 310,
  },

  // PROFILE
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: PURPLE,
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
  },

  profileEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.5,
    marginBottom: 5,
  },

  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.2,
  },

  profileSubtitle: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 2,
  },

  // SECTIONS
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.2,
  },

  sectionDescription: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 14,
  },

  menuCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    paddingHorizontal: 16,
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 14,
  },

  disabledRow: {
    opacity: 0.6,
  },

  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PALE_RED,
    alignItems: "center",
    justifyContent: "center",
  },

  menuText: {
    flex: 1,
    minWidth: 0,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },

  logoutTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: RED,
  },

  menuSubtitle: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 17,
    marginTop: 2,
  },

  // ERROR
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALE_RED,
    borderWidth: 1,
    borderColor: "#F5C7CC",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    color: RED,
    lineHeight: 18,
  },

  footerText: {
    fontSize: 11,
    color: colors.textSub,
    textAlign: "center",
    marginTop: 32,
  },
});



