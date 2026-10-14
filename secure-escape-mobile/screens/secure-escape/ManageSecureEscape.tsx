import React, { useState } from "react";
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
import { useRouter } from "expo-router";

import { colors } from "@/utils/theme";
import { getEmergencyContacts } from "@/services/emergencyContactService";
import { getActiveDecoyProfile } from "@/services/secureEscapeService";
import { EmergencyContactResponse } from "@/types/emergencyContact";
import { DecoyProfileResponse } from "@/types/secureEscape";
import VerifyPinModal from "@/components/VerifyPinModal";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const LINE = "#E9E8F0";
const PALE_PURPLE = "#F3F0FF";

const GREEN = "#168452";
const PALE_GREEN = "#EAF7F0";

const RED = "#B42332";
const PALE_RED = "#FFF0F0";

export default function ManageSecureEscape() {
  const router = useRouter();

  const [contacts, setContacts] = useState<
    EmergencyContactResponse[]
  >([]);

  const [profile, setProfile] =
    useState<DecoyProfileResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [identityVerified, setIdentityVerified] =
    useState(false);

  const [verifyVisible, setVerifyVisible] =
    useState(true);

  const [error, setError] = useState("");

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const [contactData, profileData] =
        await Promise.all([
          getEmergencyContacts(),
          getActiveDecoyProfile(),
        ]);

      setContacts(contactData);
      setProfile(profileData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Secure Escape details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleIdentityVerified = async () => {
    setVerifyVisible(false);
    setIdentityVerified(true);

    await loadDetails();
  };

  const formatAmount = (amount?: number) => {
    if (
      amount === undefined ||
      !Number.isFinite(amount)
    ) {
      return "Unavailable";
    }

    return `R ${amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
      />

      {/* PIN VERIFICATION */}

      <VerifyPinModal
        visible={verifyVisible}
        onCancel={() => router.back()}
        onVerified={handleIdentityVerified}
        title="Confirm your identity"
        subtitle="Enter your normal banking PIN to view Secure Escape details"
      />

      {identityVerified && (
        <>
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
                Secure Escape
              </Text>

              <View style={styles.appBarSpacer} />
            </View>

            <View style={styles.headerContent}>
              <Text style={styles.headerEyebrow}>
                SAFETY SETTINGS
              </Text>

              <Text style={styles.headerHeading}>
                Manage Secure Escape
              </Text>

              <Text style={styles.headerDescription}>
                Review your protection amount, duress
                PIN and emergency contacts.
              </Text>
            </View>

            <View style={styles.headerDivider} />

            <View style={styles.headerFooter}>
              <View style={styles.headerFooterIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#E4E1FF"
                />
              </View>

              <Text style={styles.headerFooterText}>
                Secure Escape is active
              </Text>
            </View>
          </View>

          {/* CONTENT */}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={false}
          >
            {/* STATUS */}

            <View style={styles.statusCard}>
              <View style={styles.statusIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color={GREEN}
                />
              </View>

              <View style={styles.statusCopy}>
                <Text style={styles.statusEyebrow}>
                  PROTECTION STATUS
                </Text>

                <Text style={styles.statusTitle}>
                  Secure Escape active
                </Text>

                <Text style={styles.statusDescription}>
                  Your Secure Escape profile has been
                  configured and is currently active.
                </Text>
              </View>

              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />

                <Text style={styles.activeText}>
                  Active
                </Text>
              </View>
            </View>

            {/* ERROR */}

            {!!error && (
              <TouchableOpacity
                style={styles.errorBanner}
                onPress={loadDetails}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Retry loading Secure Escape details"
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={RED}
                />

                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>
                    Couldn't load all details
                  </Text>

                  <Text style={styles.errorText}>
                    {error} Tap to try again.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* PROTECTION AMOUNT */}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Protection amount
              </Text>

              <Text style={styles.sectionDescription}>
                The amount configured for transactions
                while Secure Escape is active.
              </Text>
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={PURPLE}
                  />
                </View>

                <View style={styles.featureCopy}>
                  <Text style={styles.featureLabel}>
                    EMERGENCY BUDGET
                  </Text>

                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={styles.inlineLoader}
                    />
                  ) : (
                    <Text style={styles.amountValue}>
                      {formatAmount(
                        profile?.emergencyBudget
                      )}
                    </Text>
                  )}

                  <Text style={styles.featureDescription}>
                    Maximum amount configured for
                    duress-mode transactions.
                  </Text>
                </View>
              </View>
            </View>

            {/* DURESS PIN */}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Duress PIN
              </Text>

              <Text style={styles.sectionDescription}>
                Your Secure Escape PIN remains hidden.
              </Text>
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name="key-outline"
                    size={20}
                    color={PURPLE}
                  />
                </View>

                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>
                    Secure Escape PIN
                  </Text>

                  <Text style={styles.pinValue}>
                    • • • •
                  </Text>

                  <Text style={styles.featureDescription}>
                    Your PIN is set and cannot be viewed
                    from this screen.
                  </Text>
                </View>

                <View style={styles.setBadge}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={13}
                    color={PURPLE}
                  />

                  <Text style={styles.setBadgeText}>
                    Set
                  </Text>
                </View>
              </View>
            </View>

            {/* EMERGENCY CONTACTS */}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Emergency contacts
              </Text>

              <Text style={styles.sectionDescription}>
                Contacts linked to your Secure Escape
                profile.
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator
                  color={colors.primary}
                />

                <Text style={styles.loadingText}>
                  Loading emergency contacts…
                </Text>
              </View>
            ) : contacts.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="people-outline"
                    size={27}
                    color={PURPLE}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No emergency contacts
                </Text>

                <Text style={styles.emptyDescription}>
                  There are currently no emergency
                  contacts linked to this profile.
                </Text>
              </View>
            ) : (
              <View style={styles.contactsCard}>
                {contacts.map(
                  (contact, index) => (
                    <View
                      key={contact.id}
                      style={[
                        styles.contactRow,
                        index ===
                          contacts.length - 1 &&
                          styles.lastContactRow,
                      ]}
                    >
                      <View
                        style={styles.contactIcon}
                      >
                        <Ionicons
                          name="person-outline"
                          size={19}
                          color={PURPLE}
                        />
                      </View>

                      <View
                        style={styles.contactInfo}
                      >
                        <View
                          style={
                            styles.contactNameRow
                          }
                        >
                          <Text
                            style={
                              styles.contactName
                            }
                            numberOfLines={1}
                          >
                            {contact.fullName}
                          </Text>

                          {contact.isPrimary && (
                            <View
                              style={
                                styles.primaryBadge
                              }
                            >
                              <Text
                                style={
                                  styles.primaryText
                                }
                              >
                                Primary
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text
                          style={
                            styles.contactPhone
                          }
                        >
                          {contact.phoneNumber}
                        </Text>

                        {!!contact.relationship && (
                          <Text
                            style={
                              styles.contactRelationship
                            }
                          >
                            {contact.relationship}
                          </Text>
                        )}
                      </View>
                    </View>
                  )
                )}
              </View>
            )}

            {/* MANAGEMENT NOTICE */}

            <View style={styles.noticeCard}>
              <View style={styles.noticeIcon}>
                <Ionicons
                  name="business-outline"
                  size={19}
                  color={PURPLE}
                />
              </View>

              <View style={styles.noticeCopy}>
                <Text style={styles.noticeTitle}>
                  Need to make changes?
                </Text>

                <Text style={styles.noticeText}>
                  To change your protection amount,
                  duress PIN, or emergency contacts,
                  contact your nearest branch.
                </Text>
              </View>
            </View>

            {/* PRIVACY NOTE */}

            <View style={styles.privacyNote}>
              <Ionicons
                name="eye-off-outline"
                size={18}
                color={colors.textSub}
              />

              <Text style={styles.privacyText}>
                Keep your Secure Escape settings
                private and avoid sharing your duress
                PIN with anyone.
              </Text>
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // HEADER — SAME STANDARD AS OTHER SCREENS

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
    backgroundColor:
      "rgba(255,255,255,0.20)",
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
    backgroundColor:
      "rgba(255,255,255,0.10)",
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
    paddingBottom: 44,
  },

  // STATUS CARD

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: WHITE,
    padding: 16,
    marginBottom: 28,
    gap: 12,
  },

  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PALE_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  statusCopy: {
    flex: 1,
    minWidth: 0,
  },

  statusEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
  },

  statusDescription: {
    fontSize: 11,
    color: colors.textSub,
    lineHeight: 16,
    marginTop: 4,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: PALE_GREEN,
    gap: 5,
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },

  activeText: {
    fontSize: 9,
    fontWeight: "700",
    color: GREEN,
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

  // GENERAL DETAIL CARD

  detailsCard: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: WHITE,
    padding: 16,
    marginBottom: 28,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  featureIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  featureCopy: {
    flex: 1,
    minWidth: 0,
  },

  featureLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.7,
    marginBottom: 5,
  },

  featureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },

  featureDescription: {
    fontSize: 11,
    color: colors.textSub,
    lineHeight: 16,
    marginTop: 4,
  },

  amountValue: {
    fontSize: 23,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },

  inlineLoader: {
    alignSelf: "flex-start",
    marginVertical: 3,
  },

  // PIN

  pinValue: {
    fontSize: 15,
    fontWeight: "800",
    color: PURPLE,
    letterSpacing: 3,
    marginTop: 4,
  },

  setBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: PALE_PURPLE,
    gap: 4,
  },

  setBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: PURPLE,
  },

  // CONTACTS

  contactsCard: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    marginBottom: 28,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    gap: 12,
  },

  lastContactRow: {
    borderBottomWidth: 0,
  },

  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  contactInfo: {
    flex: 1,
    minWidth: 0,
  },

  contactNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  contactName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  primaryBadge: {
    backgroundColor: PALE_PURPLE,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },

  primaryText: {
    fontSize: 9,
    fontWeight: "700",
    color: PURPLE,
  },

  contactPhone: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 4,
  },

  contactRelationship: {
    fontSize: 11,
    color: colors.textSub,
    marginTop: 2,
  },

  // EMPTY STATE

  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 34,
    marginBottom: 28,
    gap: 10,
  },

  loadingText: {
    fontSize: 12,
    color: colors.textSub,
  },

  emptyCard: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginBottom: 28,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  emptyDescription: {
    maxWidth: 250,
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSub,
    textAlign: "center",
  },

  // CHANGE NOTICE

  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_PURPLE,
    borderRadius: 15,
    padding: 16,
    gap: 12,
  },

  noticeIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeCopy: {
    flex: 1,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
  },

  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSub,
    marginTop: 4,
  },

  // PRIVACY

  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 18,
    marginTop: 24,
    gap: 9,
  },

  privacyText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSub,
    lineHeight: 18,
  },

  // ERROR

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_RED,
    borderWidth: 1,
    borderColor: "#F5C7CC",
    borderRadius: 13,
    padding: 14,
    marginBottom: 24,
    gap: 9,
  },

  errorCopy: {
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
});