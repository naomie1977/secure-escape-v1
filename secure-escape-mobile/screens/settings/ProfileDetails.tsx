import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { colors } from "@/utils/theme";
import { getProfileMe } from "@/services/profileService";
import { ProfileMeResponse } from "@/types/profile";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const LINE = "#E9E8F0";
const PALE_PURPLE = "#F3F0FF";
const GREEN = "#168452";
const PALE_GREEN = "#EAF7F0";
const RED = "#B42332";
const PALE_RED = "#FDECEC";

export default function ProfileDetails() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<ProfileMeResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProfileMe();
      setProfile(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          setLoading(true);
          setError("");

          const data = await getProfileMe();

          if (active) {
            setProfile(data);
          }
        } catch (err) {
          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to load profile."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      load();

      return () => {
        active = false;
      };
    }, [])
  );

  const fullName = profile?.fullName?.trim() || "";

  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?";

  const isActive = profile?.status === "Active";

  const DetailRow = ({
    icon,
    label,
    value,
    last = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string | null;
    last?: boolean;
  }) => (
    <View
      style={[
        styles.detailRow,
        last && styles.lastDetailRow,
      ]}
    >
      <View style={styles.detailIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={PURPLE}
        />
      </View>

      <View style={styles.detailTextGroup}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text
          style={styles.detailValue}
          selectable
        >
          {value || "—"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
      />

      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={WHITE}
            />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>
            My information
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            PROFILE
          </Text>

          <Text style={styles.headerHeading}>
            Your information
          </Text>

          <Text style={styles.headerDescription}>
            View the personal details linked to your
            SecureEscape profile.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="person-outline"
              size={16}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            Personal account details
          </Text>
        </View>
      </View>

      {/* CONTENT */}

      {loading && !profile ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.stateDescription}>
            Loading your information…
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE SUMMARY */}

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initials}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileEyebrow}>
                ACCOUNT HOLDER
              </Text>

              <Text
                style={styles.profileName}
                numberOfLines={2}
              >
                {fullName || "Account holder"}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isActive
                      ? PALE_GREEN
                      : PALE_RED,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isActive
                        ? GREEN
                        : RED,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.statusText,
                    {
                      color: isActive
                        ? GREEN
                        : RED,
                    },
                  ]}
                >
                  {profile?.status || "Unknown"}
                </Text>
              </View>
            </View>
          </View>

          {/* ERROR */}

          {!!error && (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={loadProfile}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Retry loading profile"
            >
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={RED}
              />

              <View style={styles.errorTextGroup}>
                <Text style={styles.errorTitle}>
                  Couldn't refresh your information
                </Text>

                <Text style={styles.errorText}>
                  {error} Tap to try again.
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* CONTACT */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Contact
            </Text>

            <Text style={styles.sectionDescription}>
              Your registered contact details.
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <DetailRow
              icon="mail-outline"
              label="Email"
              value={profile?.email}
            />

            <DetailRow
              icon="call-outline"
              label="Phone number"
              value={profile?.phoneNumber}
              last
            />
          </View>

          {/* ACCOUNT */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Account information
            </Text>

            <Text style={styles.sectionDescription}>
              Details linked to your banking profile.
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <DetailRow
              icon="business-outline"
              label="Bank customer ID"
              value={profile?.bankCustomerId}
              last
            />
          </View>

          {/* INFO NOTE */}

          <View style={styles.infoNote}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={PURPLE}
            />

            <Text style={styles.infoNoteText}>
              Some profile information may only be
              changed through supported account
              management channels.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // HEADER

  header: {
    backgroundColor: PURPLE,
  },

  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 24) + 8
        : 56,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },

  appBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: WHITE,
    textAlign: "center",
  },

  appBarSpacer: {
    width: 44,
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

  headerDivider: {
    display: "none",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
    marginHorizontal: 24,
  },

  headerFooter: {
    display: "none",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },

  headerFooterIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerFooterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E4E1FF",
  },

  // CONTENT

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 42,
  },

  // PROFILE SUMMARY

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 17,
    padding: 18,
    backgroundColor: WHITE,
    marginBottom: 28,
    gap: 14,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 20,
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
    letterSpacing: 0.6,
    marginBottom: 5,
  },

  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.2,
  },

  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 9,
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // SECTIONS

  sectionHeader: {
    marginBottom: 13,
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
  },

  detailsCard: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    marginBottom: 28,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    gap: 12,
  },

  lastDetailRow: {
    borderBottomWidth: 0,
  },

  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  detailTextGroup: {
    flex: 1,
    minWidth: 0,
  },

  detailLabel: {
    fontSize: 11,
    color: colors.textSub,
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
    lineHeight: 19,
  },

  // ERROR

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F5C7CC",
    borderRadius: 13,
    backgroundColor: PALE_RED,
    gap: 9,
  },

  errorTextGroup: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: RED,
  },

  errorText: {
    fontSize: 11,
    color: RED,
    lineHeight: 17,
    marginTop: 3,
  },

  // NOTE

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 18,
    gap: 9,
  },

  infoNoteText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSub,
    lineHeight: 18,
  },

  // LOADING STATE

  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 12,
  },

  stateDescription: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
  },
});
