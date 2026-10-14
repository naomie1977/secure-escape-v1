// screens/secure-escape/EmergencyBudget.tsx

import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner, ErrorModal } from "@/components/FormErrorMessage";
import { upsertDecoyProfile } from "@/services/secureEscapeService";
import { colors } from "@/utils/theme";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const BACKGROUND = "#F7F6FB";
const LINE = "#E8E6F0";
const PALE_PURPLE = "#EFEBFC";
const MUTED_PURPLE = "#DCD5F5";

const DEFAULT_TIER_2_DELAY_HOURS = 24;

const formatCurrency = (value: number) =>
  `R ${value.toLocaleString("en-ZA")}`;

export default function EmergencyBudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { profileType } = useLocalSearchParams<{
    profileType?: "LowProfile" | "Custom";
  }>();

  const isLowProfile = profileType === "LowProfile";

  const [lowAmount, setLowAmount] = useState(200);
  const [tier1, setTier1] = useState(2000);
  const [tier2, setTier2] = useState(20000);

  // In Custom mode, the Tier 1 amount is also used as the balance initially
  // displayed by the decoy profile.
  const [displayBalance, setDisplayBalance] = useState(2000);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Protection Amount information modal
  const [protectionModalVisible, setProtectionModalVisible] = useState(false);

  // Terms & Conditions modal
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [modalAgreed, setModalAgreed] = useState(false);

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const clearError = () => {
    setError(null);
    setShowErrorModal(false);
  };

  const handleSliderChange = (
    value: number,
    type: "low" | "tier1" | "tier2"
  ) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearError();

    if (type === "low") {
      setLowAmount(value);
      return;
    }

    if (type === "tier1") {
      setTier1(value);

      if (profileType === "Custom") {
        setDisplayBalance(value);
      }

      return;
    }

    setTier2(value);
  };

  const openProtectionModal = () => {
    setProtectionModalVisible(true);
  };

  const closeProtectionModal = () => {
    setProtectionModalVisible(false);
  };

  const openTermsModal = () => {
    clearError();
    setModalAgreed(false);
    setTermsModalVisible(true);
  };

  const closeTermsModal = () => {
    if (isSaving) return;
    setTermsModalVisible(false);
    setModalAgreed(false);
  };

  const getValidationMessage = () => {
    if (profileType !== "LowProfile" && profileType !== "Custom") {
      return "Please choose a Secure Escape mode before setting your protection amount.";
    }

    if (profileType === "LowProfile") {
      if (lowAmount < 200 || lowAmount > 1000) {
        return "Low Profile protection amount must be between R200 and R1,000.";
      }

      return null;
    }

    if (tier1 < 500 || tier1 > 5000) {
      return "Tier 1 protection amount must be between R500 and R5,000.";
    }

    if (tier2 < 0 || tier2 > 50000) {
      return "Tier 2 protection amount must be between R0 and R50,000.";
    }

    if (displayBalance < 0 || displayBalance > 1000000) {
      return "Display balance must be between R0 and R1,000,000.";
    }

    return null;
  };

  const handleContinue = () => {
    const validationMessage = getValidationMessage();

    if (validationMessage) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(validationMessage);
      return;
    }

    openTermsModal();
  };

  const handleConfirm = async () => {
    if (!modalAgreed || isSaving) return;

    const validationMessage = getValidationMessage();

    if (validationMessage) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(validationMessage);
      return;
    }

    if (profileType !== "LowProfile" && profileType !== "Custom") {
      showError("Please choose a Secure Escape mode before saving your setup.");
      return;
    }

    try {
      setIsSaving(true);
      clearError();

      if (profileType === "LowProfile") {
        await upsertDecoyProfile({
          profileType: "LowProfile",
          displayBalance: lowAmount,
          emergencyBudget: lowAmount,
          tier1Limit: lowAmount,
          tier2Limit: 0,
          tier2DelayHours: DEFAULT_TIER_2_DELAY_HOURS,
        });
      } else {
        await upsertDecoyProfile({
          profileType: "Custom",
          displayBalance,
          emergencyBudget: tier1,
          tier1Limit: tier1,
          tier2Limit: tier2,
          tier2DelayHours: DEFAULT_TIER_2_DELAY_HOURS,
        });
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTermsModalVisible(false);
      setModalAgreed(false);

      router.push({
        pathname: "/secure-escape/duress-pin",
        params: { profileType, from: "onboarding" },
      });
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      showError(
        err instanceof Error
          ? err.message
          : "Failed to save your Secure Escape setup."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* ONBOARDING HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 4,
          },
        ]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={21} color={WHITE} />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Secure Escape</Text>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.stepRow}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>STEP 02</Text>
            </View>

            <Text style={styles.stepCaption}>PROTECTION SETUP</Text>
          </View>

          <Text style={styles.headerTitle}>Set your protection amount</Text>

          <Text style={styles.headerDescription}>
            Choose the amount available if you&apos;re forced to transact under
            duress.
          </Text>
        </View>
      </View>

      {/* CONTENT SCROLL */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* CENTERED HELP LINK */}
        <TouchableOpacity
          style={styles.howItWorks}
          onPress={openProtectionModal}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="What is the protection amount?"
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={PURPLE}
          />

          <Text style={styles.howItWorksText}>
            What is the protection amount?
          </Text>

          <Ionicons name="chevron-forward" size={16} color={PURPLE} />
        </TouchableOpacity>

        {/* MODE BANNER */}
        <View style={styles.modeBadgeCard}>
          <View style={styles.modeBadgeIcon}>
            <Ionicons
              name={isLowProfile ? "shield-outline" : "layers-outline"}
              size={20}
              color={PURPLE}
            />
          </View>

          <View style={styles.modeBadgeCopy}>
            <Text style={styles.modeBadgeEyebrow}>SELECTED MODE</Text>
            <Text style={styles.modeBadgeTitle}>
              {isLowProfile ? "Low Profile Mode" : "Realistic Decoy Mode"}
            </Text>
            <Text style={styles.modeBadgeSubtitle}>
              {isLowProfile
                ? "Configures a single small protection balance."
                : "Configures instant and delayed transaction limits."}
            </Text>
          </View>
        </View>

        {/* SLIDERS SECTION */}
        {isLowProfile ? (
          /* LOW PROFILE SLIDER */
          <View style={styles.sliderCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Protection Amount</Text>
              <View style={styles.rangeBadge}>
                <Text style={styles.rangeBadgeText}>R200 – R1,000</Text>
              </View>
            </View>

            <Text style={styles.cardSubtitle}>
              Available balance shown in Low Profile decoy mode.
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={200}
              maximumValue={1000}
              step={10}
              value={lowAmount}
              onValueChange={(val: number) => handleSliderChange(val, "low")}
              minimumTrackTintColor={PURPLE}
              maximumTrackTintColor={LINE}
              thumbTintColor={PURPLE}
            />

            <View style={styles.valueRow}>
              <Text style={styles.suggestedLabel}>Suggested: R200</Text>
              <Text style={styles.valueAmount}>{formatCurrency(lowAmount)}</Text>
            </View>
          </View>
        ) : (
          /* REALISTIC DECOY SLIDERS (TIER 1 & TIER 2) */
          <>
            {/* TIER 1 */}
            <View style={styles.sliderCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Tier 1 — Instant Limit</Text>
                <View style={styles.rangeBadge}>
                  <Text style={styles.rangeBadgeText}>R500 – R5,000</Text>
                </View>
              </View>

              <Text style={styles.cardSubtitle}>
                Available immediately during a duress session.
              </Text>

              <Slider
                style={styles.slider}
                minimumValue={500}
                maximumValue={5000}
                step={50}
                value={tier1}
                onValueChange={(val: number) =>
                  handleSliderChange(val, "tier1")
                }
                minimumTrackTintColor={PURPLE}
                maximumTrackTintColor={LINE}
                thumbTintColor={PURPLE}
              />

              <View style={styles.valueRow}>
                <Text style={styles.suggestedLabel}>Instant transfer limit</Text>
                <Text style={styles.valueAmount}>{formatCurrency(tier1)}</Text>
              </View>
            </View>

            {/* TIER 2 */}
            <View style={styles.sliderCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Tier 2 — Delayed Limit</Text>
                <View style={styles.rangeBadge}>
                  <Text style={styles.rangeBadgeText}>Up to R50,000</Text>
                </View>
              </View>

              <Text style={styles.cardSubtitle}>
                Delayed by 24 hours to give you time to reach safety.
              </Text>

              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={50000}
                step={500}
                value={tier2}
                onValueChange={(val: number) =>
                  handleSliderChange(val, "tier2")
                }
                minimumTrackTintColor={PURPLE}
                maximumTrackTintColor={LINE}
                thumbTintColor={PURPLE}
              />

              <View style={styles.valueRow}>
                <Text style={styles.suggestedLabel}>Delayed transfer limit</Text>
                <Text style={styles.valueAmount}>{formatCurrency(tier2)}</Text>
              </View>
            </View>
          </>
        )}

        {/* NOTICE CARD */}
        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={PURPLE}
          />

          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>Note: </Text>
            These limits form part of your Secure Escape protection profile and
            are used when the duress feature is activated.
          </Text>
        </View>

        <ErrorBanner
          message={error}
          onPress={() => setShowErrorModal(true)}
        />
      </ScrollView>

      {/* FIXED BOTTOM ACTION */}
      <View
        style={[
          styles.bottomArea,
          {
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={WHITE} />
        </TouchableOpacity>

        <Text style={styles.bottomNote}>Next: Set up your duress PIN</Text>
      </View>

      {/* ERROR MODAL */}
      <ErrorModal
        title="Secure Escape setup"
        message={error}
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
      />

      {/* PROTECTION INFO MODAL (BOTTOM SHEET) */}
      <Modal
        transparent
        visible={protectionModalVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeProtectionModal}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeProtectionModal}
            accessibilityRole="button"
            accessibilityLabel="Close protection amount information"
          />

          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons name="shield-outline" size={21} color={PURPLE} />
              </View>

              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>SECURE ESCAPE</Text>
                <Text style={styles.modalTitle}>Protection Amount</Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeProtectionModal}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.modalIntro}>
                This setting controls what amount is visible and accessible
                through your Secure Escape protection profile during a duress
                event.
              </Text>

              <InfoPoint>
                <Text style={styles.bold}>Low Profile Mode:</Text> Uses a single
                smaller protection amount (R200 – R1,000) for minimal exposure.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>Realistic Decoy Mode:</Text> Sets up a
                two-tier system with an immediate transfer limit and a delayed
                transfer limit.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>Tier 1 (Instant):</Text> Leaves your
                account immediately so the attacker believes the transfer has
                succeeded.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>Tier 2 (Delayed):</Text> Holds larger
                transfers for 24 hours, giving you time to reach safety and
                cancel the transfer.
              </InfoPoint>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeProtectionModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TERMS & CONDITIONS MODAL (BOTTOM SHEET) */}
      <Modal
        visible={termsModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeTermsModal}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeTermsModal}
            accessibilityRole="button"
            accessibilityLabel="Close terms and conditions"
          />

          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={21}
                  color={PURPLE}
                />
              </View>

              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>BEFORE YOU CONTINUE</Text>
                <Text style={styles.modalTitle}>Terms & Conditions</Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeTermsModal}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.termsAmountCard}>
                <Text style={styles.termsAmountLabel}>
                  {isLowProfile
                    ? "SELECTED PROTECTION AMOUNT"
                    : "SELECTED TIER LIMITS"}
                </Text>

                <Text style={styles.termsAmountValue}>
                  {isLowProfile
                    ? formatCurrency(lowAmount)
                    : `Tier 1: ${formatCurrency(tier1)} | Tier 2: ${formatCurrency(tier2)}`}
                </Text>
              </View>

              <Text style={styles.termsSubtitle}>Key Points</Text>

              <InfoPoint>
                <Text style={styles.bold}>Protection profile:</Text> Your
                selected amounts will be saved as part of your Secure Escape
                protection profile.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>Genuinely under duress:</Text> Secure
                Escape should only be activated when you are genuinely under
                duress.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>Fraud response review:</Text> Activity
                associated with a duress event may be reviewed by the
                bank&apos;s authorised fraud response team.
              </InfoPoint>

              <Text style={styles.termsNoticeText}>
                Review your bank&apos;s applicable Secure Escape terms and
                privacy information before activating the feature.
              </Text>

              <TouchableOpacity
                style={styles.agreementRow}
                onPress={() => setModalAgreed((current) => !current)}
                disabled={isSaving}
                activeOpacity={0.8}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: modalAgreed,
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    modalAgreed && styles.checkboxChecked,
                  ]}
                >
                  {modalAgreed && (
                    <Ionicons name="checkmark" size={16} color={WHITE} />
                  )}
                </View>

                <Text style={styles.agreementText}>
                  I have read and agree to the Terms & Conditions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  (!modalAgreed || isSaving) && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!modalAgreed || isSaving}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                {isSaving ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <Text style={styles.modalButtonText}>
                    Confirm & continue
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoPoint({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.infoPoint}>
      <Ionicons
        name="checkmark-circle-outline"
        size={19}
        color={PURPLE}
        style={styles.infoPointIcon}
      />
      <Text style={styles.infoPointText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  // HEADER
  header: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
  },

  topBar: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backButton: {
    width: 44,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },

  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: WHITE,
  },

  topBarSpacer: {
    width: 44,
  },

  headerContent: {
    paddingHorizontal: 22,
    paddingTop: 9,
    paddingBottom: 16,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 8,
  },

  stepPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  stepPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: WHITE,
  },

  stepCaption: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: MUTED_PURPLE,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30,
    color: WHITE,
  },

  headerDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#E4E1FF",
    marginTop: 5,
  },

  // SCROLL CONTENT
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },

  howItWorks: {
    minHeight: 37,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 10,
  },

  howItWorksText: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
  },

  // MODE BANNER
  modeBadgeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 14,
    padding: 13,
    gap: 12,
    marginBottom: 14,
  },

  modeBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  modeBadgeCopy: {
    flex: 1,
  },

  modeBadgeEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSub,
    letterSpacing: 0.7,
    marginBottom: 2,
  },

  modeBadgeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
  },

  modeBadgeSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSub,
    marginTop: 2,
  },

  // SLIDER CARDS
  sliderCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 15,
    padding: 16,
    marginBottom: 13,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
  },

  rangeBadge: {
    backgroundColor: PALE_PURPLE,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  rangeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: PURPLE,
  },

  cardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSub,
    marginBottom: 12,
  },

  slider: {
    width: "100%",
    height: 38,
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 11,
    marginTop: 8,
  },

  suggestedLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSub,
  },

  valueAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: PURPLE,
  },

  // NOTE
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_PURPLE,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    gap: 9,
    marginBottom: 14,
  },

  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSub,
  },

  noteBold: {
    fontWeight: "800",
    color: colors.navy,
  },

  // BOTTOM ACTION
  bottomArea: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },

  continueButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: PURPLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  continueText: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
  },

  bottomNote: {
    fontSize: 11,
    color: colors.textSub,
    textAlign: "center",
    marginTop: 6,
  },

  // MODAL ROOT & BOTTOM SHEET
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.52)",
  },

  modalSheet: {
    maxHeight: "86%",
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: LINE,
    alignSelf: "center",
    marginBottom: 17,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 11,
  },

  modalHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  modalHeaderCopy: {
    flex: 1,
  },

  modalEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSub,
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.navy,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  modalIntro: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSub,
    marginBottom: 16,
  },

  infoPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },

  infoPointIcon: {
    marginTop: 1,
  },

  infoPointText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSub,
  },

  bold: {
    fontWeight: "700",
    color: colors.navy,
  },

  modalButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  modalButtonDisabled: {
    opacity: 0.5,
  },

  modalButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: WHITE,
  },

  // TERMS MODAL SPECIFICS
  termsAmountCard: {
    backgroundColor: PALE_PURPLE,
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },

  termsAmountLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: PURPLE,
    letterSpacing: 0.6,
  },

  termsAmountValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 4,
  },

  termsSubtitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 12,
  },

  termsNoticeText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSub,
    marginTop: 6,
    marginBottom: 14,
  },

  agreementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  checkboxChecked: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },

  agreementText: {
    flex: 1,
    fontSize: 12,
    color: colors.navy,
    fontWeight: "600",
  },
});
