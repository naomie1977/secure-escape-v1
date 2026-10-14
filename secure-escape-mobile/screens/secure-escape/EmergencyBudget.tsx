
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/utils/theme";
import { upsertDecoyProfile } from "@/services/secureEscapeService";
import { getAccounts } from "@/services/accountService";
import { AccountResponse } from "@/types/account";
import {
  ErrorBanner,
  ErrorModal,
} from "@/components/FormErrorMessage";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const BACKGROUND = "#F7F6FB";
const LINE = "#E8E6F0";
const PALE_PURPLE = "#EFEBFC";
const MUTED_PURPLE = "#DCD5F5";
const GREEN = "#178456";

type ProfileType = "LowProfile" | "Custom";

const formatCurrency = (amount: number) =>
  `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const sanitizeAmount = (text: string) =>
  text
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*)\./g, "$1");

export default function EmergencyBudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { profileType } = useLocalSearchParams<{
    profileType?: ProfileType;
  }>();

  const isLowProfile = profileType === "LowProfile";

  const [mainAccount, setMainAccount] =
    useState<AccountResponse | null>(null);

  const [isLoadingBalance, setIsLoadingBalance] =
    useState(true);

  const [useRecommendedAmount, setUseRecommendedAmount] =
    useState(true);

  // Manual inputs
  const [manualLowAmount, setManualLowAmount] =
    useState("200");

  const [manualTier1, setManualTier1] =
    useState("2000");

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [showErrorModal, setShowErrorModal] =
    useState(false);

  const [
    protectionModalVisible,
    setProtectionModalVisible,
  ] = useState(false);

  const [termsModalVisible, setTermsModalVisible] =
    useState(false);

  const [modalAgreed, setModalAgreed] =
    useState(false);

  // Match the selected persona's decoy-balance policy.
  const recommendedAmount = mainAccount
    ? isLowProfile
      ? Math.min(
          50000,
          Math.max(
            200,
            Math.round(mainAccount.availableBalance * 0.07 * 100) / 100
          )
        )
      : Math.max(
          200,
          Math.round(mainAccount.availableBalance * 0.2 * 100) / 100
        )
    : 0;

  const lowAmount = Number(manualLowAmount);
  const tier1 = Number(manualTier1);

  const selectedAmount = useRecommendedAmount
    ? recommendedAmount
    : isLowProfile
      ? lowAmount
      : tier1;

  useEffect(() => {
    let mounted = true;

    const loadMainAccount = async () => {
      try {
        const accounts = await getAccounts();

        if (!mounted) return;

        const account =
          accounts.find(
            (item) =>
              item.status === "Active" &&
              item.accountType === "Cheque"
          ) ??
          accounts.find(
            (item) => item.status === "Active"
          );

        if (!account) {
          setError(
            "We could not find an active main account."
          );
          return;
        }

        setMainAccount(account);
      } catch (loadError) {
        if (!mounted) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load your available balance."
        );
      } finally {
        if (mounted) {
          setIsLoadingBalance(false);
        }
      }
    };

    void loadMainAccount();

    return () => {
      mounted = false;
    };
  }, []);

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const clearError = () => {
    setError(null);
    setShowErrorModal(false);
  };

  const updateAmount = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(sanitizeAmount(value));
    clearError();
  };

  const chooseManualAmount = () => {
    setUseRecommendedAmount(false);
    clearError();

    void Haptics.selectionAsync().catch(() => {});
  };

  const chooseRecommendedAmount = () => {
    if (!mainAccount || recommendedAmount <= 0) {
      showError(
        "Your recommended amount is not available yet."
      );
      return;
    }

    setUseRecommendedAmount(true);
    clearError();

    void Haptics.selectionAsync().catch(() => {});
  };

  const getValidationMessage = () => {
    if (
      profileType !== "LowProfile" &&
      profileType !== "Custom"
    ) {
      return "Please choose a Secure Escape mode before setting your protection amount.";
    }

    if (isLoadingBalance) {
      return "Please wait while we load your main account balance.";
    }

    if (useRecommendedAmount) {
      if (!mainAccount || recommendedAmount <= 0) {
        return "We could not calculate a recommended amount from your main account.";
      }

      return null;
    }

    if (isLowProfile) {
      if (
        manualLowAmount.trim() === "" ||
        !Number.isFinite(lowAmount) ||
        lowAmount < 200 ||
        lowAmount > 1000
      ) {
        return "Please enter an amount between R200 and R1,000.";
      }
    } else {
      if (
        manualTier1.trim() === "" ||
        !Number.isFinite(tier1) ||
        tier1 < 500 ||
        tier1 > 100000000
      ) {
        return "Please enter a protection amount between R500 and R100,000,000.";
      }

    }

    return null;
  };

  const openTermsAfterValidation = () => {
    const validationMessage = getValidationMessage();

    if (validationMessage) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});

      showError(validationMessage);
      return;
    }

    setModalAgreed(false);
    setTermsModalVisible(true);
  };

  const handleRecommendedAmount = () => {
    if (!mainAccount || recommendedAmount <= 0) {
      showError(
        "Your recommended amount is not available yet."
      );
      return;
    }

    setUseRecommendedAmount(true);
    clearError();

    void Haptics.selectionAsync().catch(() => {});

    // Preserve the existing shortcut to terms.
    setModalAgreed(false);
    setTermsModalVisible(true);
  };

  const closeTermsModal = () => {
    if (isSaving) return;

    setTermsModalVisible(false);
    setModalAgreed(false);
  };

  const handleConfirm = async () => {
    if (!modalAgreed || isSaving) return;

    const validationMessage = getValidationMessage();

    if (validationMessage) {
      showError(validationMessage);
      return;
    }

    const emergencyBudget = selectedAmount;

    try {
      setIsSaving(true);
      clearError();

      await upsertDecoyProfile({
        profileType: profileType as ProfileType,

        displayBalance: useRecommendedAmount
          ? emergencyBudget
          : isLowProfile
            ? 500
            : tier1,

        emergencyBudget,

        tier1Limit: useRecommendedAmount
          ? emergencyBudget
          : tier1,

        tier2Limit: useRecommendedAmount
          ? emergencyBudget
          : tier1,

        tier2DelayHours: 24,
      });

      setTermsModalVisible(false);
      setModalAgreed(false);

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});

      router.push({
        pathname: "/secure-escape/duress-pin",
        params: {
          from: "onboarding",
        },
      });
    } catch (saveError) {
      showError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save your protection amount."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
      />

      {/* ONBOARDING HEADER */}

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 4 },
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
            <Ionicons
              name="arrow-back"
              size={21}
              color={WHITE}
            />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>
            Secure Escape
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.stepRow}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>
                STEP 02
              </Text>
            </View>

            <Text style={styles.stepCaption}>
              PROTECTION SETUP
            </Text>
          </View>

          <Text style={styles.headerTitle}>
            Set your protection amount
          </Text>

          <Text style={styles.headerDescription}>
            Choose the amount available if
            you&apos;re forced to transact under duress.
          </Text>
        </View>
      </View>

      {/* CONTENT */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* CENTERED HELP LINK */}

        <TouchableOpacity
          style={styles.howItWorks}
          onPress={() =>
            setProtectionModalVisible(true)
          }
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

          <Ionicons
            name="chevron-forward"
            size={16}
            color={PURPLE}
          />
        </TouchableOpacity>

        {useRecommendedAmount ? (
          /* RECOMMENDED AMOUNT */

          <>
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={23}
                  color={PURPLE}
                />
              </View>

              <Text style={styles.recommendationEyebrow}>
                RECOMMENDED PROTECTION AMOUNT
              </Text>

              {isLoadingBalance ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="small"
                    color={PURPLE}
                  />

                  <Text style={styles.loadingText}>
                    Calculating your amount…
                  </Text>
                </View>
              ) : mainAccount ? (
                <>
                  <Text style={styles.recommendationAmount}>
                    {formatCurrency(recommendedAmount)}
                  </Text>

                  <View style={styles.recommendationBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color={GREEN}
                    />

                    <Text style={styles.recommendationBadgeText}>
                      Recommended for you
                    </Text>
                  </View>

                  <Text style={styles.recommendationDescription}>
                    {isLowProfile
                      ? "Based on 7% of the available balance in your main account, with a minimum of R200 and a maximum of R50,000."
                      : "Based on 20% of the available balance in your main account."}
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleRecommendedAmount}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryButtonText}>
                      Use recommended amount
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={WHITE}
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.unavailableText}>
                  Your recommended amount is currently
                  unavailable. You can set your
                  protection amount manually.
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.manualLink}
              onPress={chooseManualAmount}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.manualLinkText}>
                Set amount manually
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color={PURPLE}
              />
            </TouchableOpacity>
          </>
        ) : (
          /* MANUAL ENTRY */

          <>
            <View style={styles.manualHeader}>
              <Text style={styles.manualHeading}>
                Set amount manually
              </Text>

              <Text style={styles.manualDescription}>
                {isLowProfile
                  ? "Enter your Low Profile protection amount."
                  : "Enter your Realistic Decoy protection amount."}
              </Text>
            </View>

            <View style={styles.manualCard}>
              {isLowProfile ? (
                <AmountField
                  label="Protection Amount"
                  range="R200 – R1,000"
                  value={manualLowAmount}
                  onChangeText={(value) =>
                    updateAmount(
                      value,
                      setManualLowAmount
                    )
                  }
                  placeholder="200"
                />
              ) : (
                <>
                  <AmountField
                    label="Protection Amount"
                    range="R500 – R100,000,000"
                    description="Available during a duress session"
                    value={manualTier1}
                    onChangeText={(value) =>
                      updateAmount(
                        value,
                        setManualTier1
                      )
                    }
                    placeholder="2000"
                  />
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.backToRecommended}
              onPress={chooseRecommendedAmount}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={PURPLE}
              />

              <Text
                style={styles.backToRecommendedText}
              >
                Use recommended amount instead
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* EXISTING PRODUCT NOTE */}

        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={PURPLE}
          />

          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>
              Note:{" "}
            </Text>
            This is the amount an attacker can force
            you to send. It will leave your account,
            but it&apos;s fully insured and guaranteed
            to be refunded by the bank. Your safety
            is the priority.
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
            paddingBottom: Math.max(
              insets.bottom,
              14
            ),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.continueButton,
            (isLoadingBalance ||
              (useRecommendedAmount &&
                !mainAccount)) &&
              styles.continueDisabled,
          ]}
          onPress={openTermsAfterValidation}
          disabled={
            isLoadingBalance ||
            (useRecommendedAmount && !mainAccount)
          }
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.continueText}>
            Continue
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color={WHITE}
          />
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          Next: Set your duress PIN
        </Text>
      </View>

      {/* ERROR MODAL */}

      <ErrorModal
        title="Secure Escape setup"
        message={error}
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
      />

      {/* PROTECTION AMOUNT INFO */}

      <Modal
        visible={protectionModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() =>
          setProtectionModalVisible(false)
        }
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() =>
              setProtectionModalVisible(false)
            }
            accessibilityRole="button"
            accessibilityLabel="Close protection amount information"
          />

          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  20
                ),
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={PURPLE}
                />
              </View>

              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>
                  SECURE ESCAPE
                </Text>

                <Text style={styles.modalTitle}>
                  Protection Amount
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() =>
                  setProtectionModalVisible(false)
                }
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.navy}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.modalIntro}>
                This is the amount that will be
                available to transfer if you&apos;re
                forced to transact.
              </Text>

              <InfoPoint>
                It is{" "}
                <Text style={styles.bold}>
                  guaranteed by the bank
                </Text>
                . You will be{" "}
                <Text style={styles.bold}>
                  refunded within 72 hours
                </Text>{" "}
                of reporting the incident with a
                police case number.
              </InfoPoint>

              <InfoPoint>
                It{" "}
                <Text style={styles.bold}>
                  satisfies the attacker
                </Text>
                . The money{" "}
                <Text style={styles.bold}>
                  actually leaves your account
                </Text>
                , so the attacker believes
                they&apos;ve succeeded — keeping you
                safe.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  The rest is locked
                </Text>
                . Everything above this amount is
                frozen and protected.
              </InfoPoint>

              <InfoPoint>
                The{" "}
                <Text style={styles.bold}>
                  bank and police are silently alerted
                </Text>{" "}
                the moment your duress PIN is used.
              </InfoPoint>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() =>
                  setProtectionModalVisible(false)
                }
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>
                  Got it
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TERMS & CONDITIONS */}

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
                paddingBottom: Math.max(
                  insets.bottom,
                  20
                ),
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
                <Text style={styles.modalEyebrow}>
                  BEFORE YOU CONTINUE
                </Text>

                <Text style={styles.modalTitle}>
                  Terms & Conditions
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeTermsModal}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.navy}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.termsAmountCard}>
                <Text style={styles.termsAmountLabel}>
                  SELECTED PROTECTION AMOUNT
                </Text>

                <Text style={styles.termsAmountValue}>
                  {formatCurrency(selectedAmount)}
                </Text>
              </View>

              <Text style={styles.termsSubtitle}>
                Key Points
              </Text>

              <InfoPoint>
                <Text style={styles.bold}>
                  Refund guarantee:
                </Text>{" "}
                Any transaction made using the duress
                PIN up to the protection amount will
                be refunded by the bank within 72
                hours of the victim reporting the
                incident and providing a valid police
                case number.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  Fraud prevention:
                </Text>{" "}
                False claims of duress constitute fraud
                and will result in legal action,
                permanent feature ban, and potential
                criminal charges.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  Reporting window:
                </Text>{" "}
                The victim must report the incident
                within 72 hours of the duress event.
                Beyond this window, refunds are at
                the bank&apos;s discretion.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  Bank discretion:
                </Text>{" "}
                The bank reserves the right to
                investigate each claim and may deny
                refunds if evidence suggests fraud
                or misrepresentation.
              </InfoPoint>

              <View style={styles.termsLinkRow}>
                <Text style={styles.termsLinkText}>
                  For full details, visit{" "}
                </Text>

                <Text
                  style={styles.termsLink}
                  onPress={() =>
                    Linking.openURL(
                      "https://www.secureescape.ai"
                    )
                  }
                  accessibilityRole="link"
                >
                  www.secureescape.ai
                </Text>
              </View>

              <TouchableOpacity
                style={styles.agreementRow}
                onPress={() =>
                  setModalAgreed((current) => !current)
                }
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
                    modalAgreed &&
                      styles.checkboxChecked,
                  ]}
                >
                  {modalAgreed && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={WHITE}
                    />
                  )}
                </View>

                <Text style={styles.agreementText}>
                  I have read and agree to the
                  Terms & Conditions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  (!modalAgreed || isSaving) &&
                    styles.modalButtonDisabled,
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
                    Confirm & Agree
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

/* REUSABLE AMOUNT INPUT */

function AmountField({
  label,
  range,
  description,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  range: string;
  description?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>
          {label}
        </Text>

        <Text style={styles.fieldRange}>
          {range}
        </Text>
      </View>

      <View style={styles.amountInputRow}>
        <Text style={styles.currencyPrefix}>
          R
        </Text>

        <TextInput
          style={styles.amountInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#A0A0AE"
          maxLength={10}
          accessibilityLabel={`${label} in rand`}
        />
      </View>

      {!!description && (
        <Text style={styles.fieldDescription}>
          {description}
        </Text>
      )}
    </View>
  );
}

/* REUSABLE MODAL POINT */

function InfoPoint({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoPoint}>
      <Ionicons
        name="checkmark-circle-outline"
        size={19}
        color={PURPLE}
        style={styles.infoPointIcon}
      />

      <Text style={styles.infoPointText}>
        {children}
      </Text>
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
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backButton: {
    width: 44,
    height: 44,
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
    paddingTop: 13,
    paddingBottom: 21,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },

  stepPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
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
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 31,
    color: WHITE,
  },

  headerDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#E4E1FF",
    marginTop: 6,
  },

  // MAIN CONTENT

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // CENTERED HELP LINK

  howItWorks: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 12,
  },

  howItWorksText: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
  },

  // RECOMMENDATION CARD

  recommendationCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 17,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: "center",
  },

  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  recommendationEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.textSub,
    textAlign: "center",
  },

  recommendationAmount: {
    fontSize: 35,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    marginTop: 10,
  },

  recommendationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF7F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    gap: 5,
    marginTop: 10,
  },

  recommendationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: GREEN,
  },

  recommendationDescription: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 16,
    maxWidth: 310,
  },

  loadingContainer: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 26,
  },

  loadingText: {
    fontSize: 12,
    color: colors.textSub,
  },

  unavailableText: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 18,
  },

  // PRIMARY BUTTON

  primaryButton: {
    width: "100%",
    minHeight: 49,
    borderRadius: 12,
    backgroundColor: PURPLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: WHITE,
  },

  // MANUAL TEXT LINK

  manualLink: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 7,
    marginBottom: 10,
  },

  manualLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE,
  },

  // MANUAL ENTRY

  manualHeader: {
    marginBottom: 15,
  },

  manualHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  manualDescription: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 18,
    marginTop: 5,
  },

  manualCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    padding: 17,
  },

  fieldHeader: {
    marginBottom: 10,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },

  fieldRange: {
    fontSize: 11,
    color: colors.textSub,
    marginTop: 4,
  },

  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 53,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 14,
  },

  currencyPrefix: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    marginRight: 9,
  },

  amountInput: {
    flex: 1,
    minHeight: 51,
    paddingVertical: 0,
    fontSize: 19,
    fontWeight: "700",
    color: colors.navy,
  },

  fieldDescription: {
    fontSize: 11,
    color: colors.textSub,
    marginTop: 8,
  },

  fieldDivider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 22,
  },

  backToRecommended: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 7,
    marginBottom: 10,
  },

  backToRecommendedText: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
  },

  // NOTE

  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_PURPLE,
    padding: 14,
    borderRadius: 13,
    gap: 9,
    marginTop: 15,
    marginBottom: 12,
  },

  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSub,
  },

  noteBold: {
    fontWeight: "800",
    color: colors.navy,
  },

  // FIXED BOTTOM ACTION

  bottomArea: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },

  continueButton: {
    minHeight: 50,
    backgroundColor: PURPLE,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  continueDisabled: {
    backgroundColor: "#B9B2D0",
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
    marginTop: 9,
  },

  // MODALS

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
    paddingTop: 19,
    paddingBottom: 24,
  },

  modalIntro: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSub,
    marginBottom: 19,
  },

  infoPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 17,
  },

  infoPointIcon: {
    marginTop: 1,
  },

  infoPointText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
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
    marginTop: 14,
  },

  modalButtonDisabled: {
    backgroundColor: "#B9B2D0",
  },

  modalButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: WHITE,
  },

  // TERMS

  termsAmountCard: {
    backgroundColor: PALE_PURPLE,
    borderRadius: 13,
    padding: 15,
    marginBottom: 20,
  },

  termsAmountLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: PURPLE,
    marginBottom: 5,
  },

  termsAmountValue: {
    fontSize: 23,
    fontWeight: "800",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },

  termsSubtitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 17,
  },

  termsLinkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
    marginBottom: 18,
  },

  termsLinkText: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
  },

  termsLink: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
    textDecorationLine: "underline",
    lineHeight: 19,
  },

  agreementRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    gap: 11,
  },

  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#B8B5C4",
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxChecked: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },

  agreementText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.navy,
    fontWeight: "600",
  },
});
