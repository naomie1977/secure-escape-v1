// app/secure-escape/emergency-budget.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ErrorBanner, ErrorModal } from "@/components/FormErrorMessage";
import { upsertDecoyProfile } from "@/services/secureEscapeService";
import { colors } from "@/utils/theme";

const DEFAULT_TIER_2_DELAY_HOURS = 24;

export default function EmergencyBudgetScreen() {
  const router = useRouter();

  const { profileType } = useLocalSearchParams<{
    profileType?: "LowProfile" | "Custom";
  }>();

  const mode = profileType;

  const [lowAmount, setLowAmount] = useState(200);
  const [tier1, setTier1] = useState(2000);
  const [tier2, setTier2] = useState(20000);

  // In Custom mode, the Tier 1 amount is also used as the balance initially
  // displayed by the decoy profile.
  const [displayBalance, setDisplayBalance] = useState(2000);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Protection Amount information modal
  const [protectionModalVisible, setProtectionModalVisible] = useState(false);
  const protectionFadeAnim = useRef(new Animated.Value(0)).current;
  const protectionScaleAnim = useRef(new Animated.Value(0.9)).current;

  // Terms & Conditions modal
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const termsFadeAnim = useRef(new Animated.Value(0)).current;
  const termsScaleAnim = useRef(new Animated.Value(0.9)).current;
  const [modalAgreed, setModalAgreed] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 0.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -0.05,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, [fadeAnim, pulseAnim, rotateAnim]);

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
    type: "low" | "tier1" | "tier2",
  ) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearError();

    if (type === "low") {
      setLowAmount(value);
      return;
    }

    if (type === "tier1") {
      setTier1(value);

      if (mode === "Custom") {
        setDisplayBalance(value);
      }

      return;
    }

    setTier2(value);
  };

  const openProtectionModal = () => {
    setProtectionModalVisible(true);

    protectionFadeAnim.setValue(0);
    protectionScaleAnim.setValue(0.9);

    Animated.parallel([
      Animated.timing(protectionFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(protectionScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeProtectionModal = () => {
    Animated.parallel([
      Animated.timing(protectionFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(protectionScaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setProtectionModalVisible(false);
    });
  };

  const openTermsModal = () => {
    clearError();
    setModalAgreed(false);
    setTermsModalVisible(true);

    termsFadeAnim.setValue(0);
    termsScaleAnim.setValue(0.9);

    Animated.parallel([
      Animated.timing(termsFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(termsScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeTermsModal = () => {
    if (isSaving) {
      return;
    }

    Animated.parallel([
      Animated.timing(termsFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(termsScaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTermsModalVisible(false);
      setModalAgreed(false);
    });
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
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
      showError(validationMessage);
      return;
    }

    openTermsModal();
  };

  const handleConfirm = async () => {
    if (!modalAgreed || isSaving) {
      return;
    }

    const validationMessage = getValidationMessage();

    if (validationMessage) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
      showError(validationMessage);
      return;
    }

    if (profileType !== "LowProfile" && profileType !== "Custom") {
      showError(
        "Please choose a Secure Escape mode before saving your setup.",
      );
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

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );

      setTermsModalVisible(false);
      setModalAgreed(false);

      router.push({
        pathname: "/secure-escape/duress-pin",
        params: { profileType },
      });
    } catch (err) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );

      showError(
        err instanceof Error
          ? err.message
          : "Failed to save your Secure Escape setup.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) =>
    `R ${value.toLocaleString("en-ZA")}`;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [-0.05, 0.05],
    outputRange: ["-5deg", "5deg"],
  });

  let content: React.ReactNode;

  if (profileType === "LowProfile") {
    content = (
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.label}>
          Protection Amount{" "}
          <Text style={styles.range}>(R200 – R1,000)</Text>
        </Text>

        <Slider
          style={styles.slider}
          minimumValue={200}
          maximumValue={1000}
          step={10}
          value={lowAmount}
          onValueChange={(value: number) =>
            handleSliderChange(value, "low")
          }
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.greyLine}
          thumbTintColor={colors.primary}
        />

        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Suggested: R200</Text>
          <Text style={styles.value}>{formatCurrency(lowAmount)}</Text>
        </View>
      </Animated.View>
    );
  } else {
    content = (
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.label}>
          Protection Amount – Tier 1{" "}
          <Text style={styles.range}>(R500 – R5,000)</Text>
        </Text>

        <Slider
          style={styles.slider}
          minimumValue={500}
          maximumValue={5000}
          step={50}
          value={tier1}
          onValueChange={(value: number) =>
            handleSliderChange(value, "tier1")
          }
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.greyLine}
          thumbTintColor={colors.primary}
        />

        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Instant transfer amount</Text>
          <Text style={styles.value}>{formatCurrency(tier1)}</Text>
        </View>

        <Text style={[styles.label, styles.tierTwoLabel]}>
          Protection Amount – Tier 2{" "}
          <Text style={styles.range}>(up to R50,000)</Text>
        </Text>

        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={50000}
          step={500}
          value={tier2}
          onValueChange={(value: number) =>
            handleSliderChange(value, "tier2")
          }
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.greyLine}
          thumbTintColor={colors.primary}
        />

        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Delayed transfer amount</Text>
          <Text style={styles.value}>{formatCurrency(tier2)}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#25145F", "#25145F"]}
        style={styles.gradientHeader}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Set Protection Amount</Text>
      </LinearGradient>

      <View style={styles.whiteCard}>
        <Text style={styles.mainTitle}>Secure Escape,</Text>
        <Text style={styles.sub}>Set your protection amount</Text>

        <Text style={styles.subDescription}>
          Choose the amount available during a Secure Escape event.
          Your settings determine the limits used by your protection
          profile.
        </Text>

        <TouchableOpacity
          onPress={openProtectionModal}
          accessibilityRole="button"
        >
          <Text style={styles.link}>
            What is the protection amount?
          </Text>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { scale: pulseAnim },
                { rotate: rotateInterpolate },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={["#EDE9FE", "#DBEAFE"]}
            style={styles.iconCircle}
          >
            <Ionicons
              name="cash-outline"
              size={60}
              color={colors.primary}
            />
          </LinearGradient>
        </Animated.View>

        {content}

        <View style={styles.noteBox}>
          <Ionicons
            name="information-circle"
            size={20}
            color={colors.primary}
            style={styles.noteIcon}
          />

          <Text style={styles.noteText}>
            <Text style={styles.boldText}>Note: </Text>
            These limits form part of your Secure Escape protection
            profile and are used when the duress feature is activated.
          </Text>
        </View>

        <ErrorBanner
          message={error}
          onPress={() => setShowErrorModal(true)}
        />

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#25145F", "#25145F"]}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ErrorModal
        title="Secure Escape setup"
        message={error}
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
      />

      <Modal
        transparent
        visible={protectionModalVisible}
        animationType="none"
        onRequestClose={closeProtectionModal}
      >
        <TouchableWithoutFeedback onPress={closeProtectionModal}>
          <Animated.View
            style={[
              styles.modalOverlay,
              { opacity: protectionFadeAnim },
            ]}
          >
            <TouchableWithoutFeedback
              onPress={(event) => event.stopPropagation()}
            >
              <Animated.View
                style={[
                  styles.modalCard,
                  {
                    transform: [
                      { scale: protectionScaleAnim },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeProtectionModal}
                  accessibilityRole="button"
                  accessibilityLabel="Close protection amount information"
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.navy}
                  />
                </TouchableOpacity>

                <Text style={styles.modalTitle}>
                  Protection Amount
                </Text>

                <Text style={styles.modalSubtitle}>
                  This setting controls how much money is available
                  through your Secure Escape protection profile during a
                  duress event.
                </Text>

                <View style={styles.bulletList}>
                  <View style={styles.bulletItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>
                        Low Profile
                      </Text>{" "}
                      uses one smaller protection amount.
                    </Text>
                  </View>

                  <View style={styles.bulletItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Custom</Text>{" "}
                      allows separate Tier 1 and Tier 2 limits.
                    </Text>
                  </View>

                  <View style={styles.bulletItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.bulletText}>
                      Tier 1 represents the immediate amount available
                      under the Custom profile.
                    </Text>
                  </View>

                  <View style={styles.bulletItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.bulletText}>
                      Tier 2 represents the additional delayed limit
                      configured for the profile.
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        transparent
        visible={termsModalVisible}
        animationType="none"
        onRequestClose={closeTermsModal}
      >
        <TouchableWithoutFeedback onPress={closeTermsModal}>
          <Animated.View
            style={[
              styles.modalOverlay,
              { opacity: termsFadeAnim },
            ]}
          >
            <TouchableWithoutFeedback
              onPress={(event) => event.stopPropagation()}
            >
              <Animated.View
                style={[
                  styles.modalCard,
                  {
                    transform: [{ scale: termsScaleAnim }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeTermsModal}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Close terms and conditions"
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.navy}
                  />
                </TouchableOpacity>

                <Text style={styles.modalTitle}>
                  Terms & Conditions
                </Text>

                <Text style={styles.modalSubtitle}>
                  Key points
                </Text>

                <View style={styles.bulletList}>
                  <View style={styles.bulletItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.bulletText}>
                      Your selected amounts will be saved as part of
                      your Secure Escape protection profile.
                    </Text>
                  </View>

                  <View style={styles.bulletItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.bulletText}>
                      Secure Escape should only be activated when you
                      are genuinely under duress.
                    </Text>
                  </View>

                  <View style={styles.bulletItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.bulletText}>
                      Activity associated with a duress event may be
                      reviewed by the bank&apos;s authorised fraud
                      response team.
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalFooter}>
                  Review your bank&apos;s applicable Secure Escape
                  terms and privacy information before activating the
                  feature.
                </Text>

                <TouchableOpacity
                  style={styles.modalCheckRow}
                  onPress={() => setModalAgreed((current) => !current)}
                  activeOpacity={0.7}
                  disabled={isSaving}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: modalAgreed }}
                >
                  <View
                    style={[
                      styles.modalCheckbox,
                      modalAgreed &&
                        styles.modalCheckboxChecked,
                    ]}
                  >
                    {modalAgreed && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#fff"
                      />
                    )}
                  </View>

                  <Text style={styles.modalCheckText}>
                    I have read and agree to the Terms & Conditions
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalConfirmButton,
                    (!modalAgreed || isSaving) &&
                      styles.modalConfirmDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={!modalAgreed || isSaving}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={
                      modalAgreed && !isSaving
                        ? ["#25145F", "#25145F"]
                        : ["#ccc", "#ccc"]
                    }
                    style={styles.modalGradientButton}
                  >
                    <Text style={styles.buttonText}>
                      {isSaving
                        ? "Saving..."
                        : "Confirm & Agree"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  gradientHeader: {
    paddingTop: 65,
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  whiteCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    marginTop: -20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.navy,
    marginBottom: 4,
    lineHeight: 22,
  },
  subDescription: {
    fontSize: 14,
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 6,
  },
  link: {
    fontSize: 13,
    color: colors.primary,
    textDecorationLine: "underline",
    marginBottom: 20,
  },
  iconContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.navy,
    marginBottom: 8,
  },
  tierTwoLabel: {
    marginTop: 20,
  },
  range: {
    fontWeight: "400",
    color: colors.textSub,
    fontSize: 12,
  },
  slider: {
    width: "100%",
    height: 40,
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  valueLabel: {
    fontSize: 13,
    color: colors.textSub,
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  noteBox: {
    flexDirection: "row",
    backgroundColor: "#F5F3FF",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  noteText: {
    fontSize: 13,
    color: "#444",
    lineHeight: 20,
    flex: 1,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  continueButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  boldText: {
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 18,
  },
  bulletList: {
    marginBottom: 8,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  bulletText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
  },
  modalFooter: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 14,
    marginTop: 4,
  },
  modalCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  modalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.greyLine,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalCheckText: {
    fontSize: 13,
    color: colors.textSub,
    flex: 1,
    lineHeight: 18,
  },
  modalConfirmButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalGradientButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
});
