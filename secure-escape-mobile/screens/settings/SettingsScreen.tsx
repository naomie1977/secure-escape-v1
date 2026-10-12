import { useEffect, useState } from "react";
import { getProfileMe } from "@/services/profileService";
import { ProfileMeResponse } from "@/types/profile";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/utils/theme";
import { useRouter } from "expo-router";
import { getEnrollmentStatus } from "@/services/secureEscapeService";
import { logout } from "@/services/authService";
import { uploadScreenRecordingEvidence } from "@/services/transactionServices";
import {
  clearCompletedScreenRecording,
  isScreenRecording,
  stopScreenRecording,
} from "@/modules/secure-escape-screen-recorder/src/SecureEscapeScreenRecorder";

export default function SettingsScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileMeResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [openingSecureEscape, setOpeningSecureEscape] = useState(false);

  useEffect(() => {
    getProfileMe().then(setProfile).catch(console.error);
  }, []);

  const logoutButton = async () => {
    setError("");

    try {
      const recordingActive = await isScreenRecording();

      if (recordingActive) {
        try {
          const recording = await stopScreenRecording();

          if (recording.stopped && recording.uri) {
            await uploadScreenRecordingEvidence(recording.uri);
            clearCompletedScreenRecording();
          }
        } catch (evidenceError) {
          console.error(
            "Failed to finalize or upload screen-recording evidence:",
            evidenceError,
          );
        }
      }

      await logout();

      setTimeout(() => {
        router.replace("/(auth)");
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to logout");
    }
  };

  const openSecureEscape = async () => {
    if (openingSecureEscape) {
      return;
    }

    setOpeningSecureEscape(true);

    try {
      const enrollment = await getEnrollmentStatus();

      if (enrollment.status === "Active") {
        router.push("/secure-escape/manage-secure-escape");
        return;
      }

      if (enrollment.status === "NotConfigured") {
        router.push("/secure-escape/intro");
        return;
      }

      if (!enrollment.hasDecoyProfile) {
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
          : "Unable to check your Secure Escape setup. Please try again.",
      );
    } finally {
      setOpeningSecureEscape(false);
    }
  };

  const isDuress = profile?.sessionMode === "Duress";

  const menuItems = [
    {
      title: "My information",
      subtitle: "View and update information",
      isProfile: true,
    },

    ...(isDuress
      ? []
      : [
          {
            title: "Secure Escape",
            subtitle: "Manage your Secure Escape protection",
            isSecureEscape: true,
          },
        ]),

    {
      title: "Logout",
      subtitle: "Logout",
      isLogout: true,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Ionicons
            name="person-circle"
            size={70}
            color={colors.primary}
          />
        </View>

        <Text style={styles.name}>
          Hello {profile?.fullName ?? "..."}!
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.menu}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.menuRow}
            disabled={item.isSecureEscape && openingSecureEscape}
            onPress={async () => {
              if (item.isProfile) {
                router.push("/settings/profile-details");
              } else if (item.isSecureEscape) {
                await openSecureEscape();
              } else if (item.isLogout) {
                await logoutButton();
              }
            }}
          >
            <View style={styles.menuText}>
              <Text style={styles.rowTitle}>{item.title}</Text>

              <Text style={styles.rowSubtitle}>
                {item.isSecureEscape && openingSecureEscape
                  ? "Checking Secure Escape status..."
                  : item.subtitle}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#BBBBBB"
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  scrollContent: {
    paddingTop: 40,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 24,
    gap: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.navy,
  },

  profile: {
    alignItems: "center",
    paddingVertical: 24,
    marginTop: 8,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EFFF",
  },

  name: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },

  errorText: {
    paddingHorizontal: 20,
    marginBottom: 8,
    fontSize: 12,
    color: colors.danger ?? "#EF4444",
  },

  menu: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 8,
  },

  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
  },

  menuText: {
    flex: 1,
    paddingRight: 16,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },

  rowSubtitle: {
    fontSize: 12,
    color: colors.textSub,
  },
});
