
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/utils/theme";
import { verifyPin } from "@/services/authService";
import {
  setDuressPin as saveDuressPin,
} from "@/services/secureEscapeService";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const BACKGROUND = "#F7F6FB";
const LINE = "#E8E6F0";
const PALE_PURPLE = "#EFEBFC";
const MUTED_PURPLE = "#DCD5F5";
const RED = "#C23B49";
const PALE_RED = "#FFF1F2";

type PinFieldName = "normal" | "duress" | "confirm";

const cleanPin = (value: string) =>
  value.replace(/\D/g, "").slice(0, 4);

export default function DuressPinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { from } = useLocalSearchParams<{
    from?: string;
  }>();

  const [normalPin, setNormalPin] = useState("");
  const [duressPin, setDuressPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [touched, setTouched] = useState<
    Record<PinFieldName, boolean>
  >({
    normal: false,
    duress: false,
    confirm: false,
  });

  const [normalPinError, setNormalPinError] =
    useState("");

  const [saveError, setSaveError] = useState("");

  const [infoModalVisible, setInfoModalVisible] =
    useState(false);

  const [termsModalVisible, setTermsModalVisible] =
    useState(false);

  const [modalAgreed, setModalAgreed] =
    useState(false);

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const isBusy = isVerifying || isSaving;

  const matchingNormalPin =
    normalPin.length === 4 &&
    duressPin.length === 4 &&
    normalPin === duressPin;

  const normalValidation =
    touched.normal &&
    normalPin.length > 0 &&
    normalPin.length !== 4
      ? "Must be exactly 4 digits"
      : "";

  const duressValidation =
    touched.duress &&
    duressPin.length > 0 &&
    duressPin.length !== 4
      ? "Must be exactly 4 digits"
      : "";

  const confirmValidation =
    touched.confirm &&
    confirmPin.length > 0 &&
    confirmPin !== duressPin
      ? "PINs do not match"
      : "";

  const isFormValid =
    normalPin.length === 4 &&
    duressPin.length === 4 &&
    confirmPin.length === 4 &&
    confirmPin === duressPin &&
    !matchingNormalPin &&
    !normalPinError;

  const markTouched = (field: PinFieldName) => {
    setTouched((previous) => ({
      ...previous,
      [field]: true,
    }));
  };

  const handleNormalPinChange = (value: string) => {
    setNormalPin(cleanPin(value));
    setNormalPinError("");
    setSaveError("");
  };

  const handleDuressPinChange = (value: string) => {
    setDuressPin(cleanPin(value));
    setSaveError("");
  };

  const handleConfirmPinChange = (value: string) => {
    setConfirmPin(cleanPin(value));
    setSaveError("");
  };

  const handleContinue = async () => {
    if (isBusy) return;

    setTouched({
      normal: true,
      duress: true,
      confirm: true,
    });

    setSaveError("");

    if (!isFormValid) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      return;
    }

    try {
      setIsVerifying(true);

      const verification = await verifyPin(normalPin);

      if (!verification.verified) {
        setNormalPinError(
          "Incorrect PIN. Please try again."
        );

        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        ).catch(() => {});

        return;
      }

      setModalAgreed(false);
      setTermsModalVisible(true);

      void Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Light
      ).catch(() => {});
    } catch {
      setNormalPinError(
        "Verification failed. Please try again."
      );

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
    } finally {
      setIsVerifying(false);
    }
  };

  const closeTermsModal = () => {
    if (isSaving) return;

    setTermsModalVisible(false);
    setModalAgreed(false);
  };

  const handleConfirm = async () => {
    if (!modalAgreed || isSaving) return;

    try {
      setIsSaving(true);
      setSaveError("");

      await saveDuressPin({
        currentPin: normalPin,
        duressPin,
      });

      setTermsModalVisible(false);
      setModalAgreed(false);

      setNormalPin("");
      setDuressPin("");
      setConfirmPin("");

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});

      router.push({
        pathname: "/secure-escape/emergency-contact",
        params: from ? { from } : {},
      });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save your Duress PIN. Please try again."
      );

      setTermsModalVisible(false);
      setModalAgreed(false);
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

      {/* SHORT ONBOARDING HEADER */}

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
                STEP 03
              </Text>
            </View>

            <Text style={styles.stepCaption}>
              PROTECTION SETUP
            </Text>
          </View>

          <Text style={styles.headerTitle}>
            Set your duress PIN
          </Text>

          <Text style={styles.headerDescription}>
            Create a separate safety PIN for use only
            if you&apos;re being forced to transact
            under threat.
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.contentArea}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* HELP FIRST */}

          <TouchableOpacity
            style={styles.helpLink}
            onPress={() => setInfoModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={PURPLE}
            />

            <Text style={styles.helpLinkText}>
              What is a Duress PIN?
            </Text>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={PURPLE}
            />
          </TouchableOpacity>

          {/* NORMAL PIN NOTICE */}

          <View style={styles.noticeCard}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={PURPLE}
            />

            <Text style={styles.noticeText}>
              Your normal banking PIN will remain
              unchanged. Your duress PIN is an
              additional PIN used only to activate
              Silent Protection.
            </Text>
          </View>

          {/* CURRENT BANKING PIN — SEPARATE CARD */}

          <View style={styles.verifyCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={PURPLE}
                />
              </View>

              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>
                  Verify your identity
                </Text>

                <Text style={styles.cardSubtitle}>
                  Enter your current banking PIN.
                </Text>
              </View>
            </View>

            <PinField
              label="Current banking PIN"
              value={normalPin}
              onChangeText={handleNormalPinChange}
              onBlur={() => markTouched("normal")}
              error={
                normalPinError ||
                normalValidation
              }
              editable={!isBusy}
            />
          </View>

          {/* DURESS PIN — OWN CARD */}

          <View style={styles.duressCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={PURPLE}
                />
              </View>

              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>
                  Your Silent Safety Signal
                </Text>

                <Text style={styles.cardSubtitle}>
                  Create your separate Duress PIN.
                </Text>
              </View>
            </View>

            <PinField
              label="Create a Duress PIN"
              value={duressPin}
              onChangeText={handleDuressPinChange}
              onBlur={() => markTouched("duress")}
              error={
                matchingNormalPin
                  ? "Duress PIN must be different from your Normal PIN"
                  : duressValidation
              }
              editable={!isBusy}
            />

            <View style={styles.fieldDivider} />

            <PinField
              label="Confirm your Duress PIN"
              value={confirmPin}
              onChangeText={handleConfirmPinChange}
              onBlur={() => markTouched("confirm")}
              error={confirmValidation}
              editable={!isBusy}
            />
          </View>

          {!!saveError && (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={RED}
              />

              <Text style={styles.errorBannerText}>
                {saveError}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* FIXED ACTION */}

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
              (!isFormValid || isBusy) &&
                styles.continueDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isFormValid || isBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !isFormValid || isBusy,
            }}
          >
            {isVerifying ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Text style={styles.continueText}>
                  Continue
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={WHITE}
                />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.bottomNote}>
            Next: Add your emergency contacts
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* WHAT IS A DURESS PIN? */}

      <Modal
        transparent
        visible={infoModalVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() =>
          setInfoModalVisible(false)
        }
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() =>
              setInfoModalVisible(false)
            }
            accessibilityRole="button"
            accessibilityLabel="Close duress PIN information"
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
                  name="key-outline"
                  size={21}
                  color={PURPLE}
                />
              </View>

              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>
                  SECURE ESCAPE
                </Text>

                <Text style={styles.modalTitle}>
                  What is a Duress PIN?
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() =>
                  setInfoModalVisible(false)
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
                A duress PIN is a special PIN that
                looks like a simple typing mistake
                – but it silently activates your
                protection.
              </Text>

              <InfoPoint>
                <Text style={styles.bold}>
                  It looks normal to attackers.
                </Text>{" "}
                If they see you type it, they&apos;ll
                think you entered your normal PIN.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  It triggers your safety protocol.
                </Text>{" "}
                The moment you enter it, the bank
                and police are alerted with your
                location.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  It locks your funds.
                </Text>{" "}
                Only your safety buffer is available
                to transfer – everything else is
                frozen.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  It&apos;s guaranteed.
                </Text>{" "}
                Any amount transferred under duress
                is refunded by the bank when you
                report it.
              </InfoPoint>

              <InfoPoint>
                Your normal banking remains completely
                unchanged. This is your{" "}
                <Text style={styles.bold}>
                  silent lifeline
                </Text>{" "}
                – only for emergencies.
              </InfoPoint>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() =>
                  setInfoModalVisible(false)
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
        transparent
        visible={termsModalVisible}
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
              <Text style={styles.termsSubtitle}>
                Key Points
              </Text>

              <InfoPoint>
                <Text style={styles.bold}>
                  Misuse is fraud.
                </Text>{" "}
                Only use in genuine emergencies.
                False claims lead to{" "}
                <Text style={styles.bold}>
                  permanent deactivation and
                  criminal charges
                </Text>.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  Keep it secret.
                </Text>{" "}
                Never share your duress PIN. If
                forced to reveal it,{" "}
                <Text style={styles.bold}>
                  contact your bank immediately
                </Text>{" "}
                to reset it.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  Refund guarantee – genuine only.
                </Text>{" "}
                You&apos;ll be fully refunded if
                used in a real emergency, provided
                you{" "}
                <Text style={styles.bold}>
                  report within 72 hours with a
                  police case number
                </Text>.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  False use is a criminal offence.
                </Text>{" "}
                Fraud, perjury, and wasting police
                resources carry{" "}
                <Text style={styles.bold}>
                  severe penalties including
                  imprisonment
                </Text>.
              </InfoPoint>

              <InfoPoint>
                <Text style={styles.bold}>
                  Report immediately if compromised.
                </Text>{" "}
                Accidental use or forced disclosure{" "}
                <Text style={styles.bold}>
                  must be reported promptly
                </Text>{" "}
                – failure may void your guarantee.
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
                  setModalAgreed(
                    (previous) => !previous
                  )
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

function PinField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  error?: string;
  editable: boolean;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>
        {label}
        <Text style={styles.required}> *</Text>
      </Text>

      <View
        style={[
          styles.inputWrapper,
          !!error && styles.inputWrapperError,
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={16}
          color={colors.textSub}
        />

        <TextInput
          style={styles.pinInput}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          secureTextEntry
          keyboardType="number-pad"
          autoComplete="off"
          maxLength={4}
          placeholder="••••"
          placeholderTextColor="#BAB7C6"
          editable={editable}
          accessibilityLabel={label}
        />

        <Text style={styles.pinCount}>
          {value.length}/4
        </Text>
      </View>

      {!!error && (
        <View style={styles.fieldErrorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={RED}
          />

          <Text style={styles.fieldErrorText}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

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
    backgroundColor:
      "rgba(255,255,255,0.14)",
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

  // CONTENT

  contentArea: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },

  // HELP LINK

  helpLink: {
    minHeight: 37,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 7,
  },

  helpLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
  },

  // NOTICE

  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_PURPLE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 9,
    marginBottom: 10,
  },

  noticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSub,
  },

  // TWO DISTINCT CARDS

  verifyCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 15,
    padding: 13,
    marginBottom: 10,
  },

  duressCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 15,
    padding: 13,
  },

  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  cardIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  cardHeadingCopy: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
  },

  cardSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSub,
    marginTop: 2,
  },

  // PIN INPUT

  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 5,
  },

  required: {
    color: RED,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 43,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 11,
    gap: 9,
  },

  inputWrapperError: {
    borderColor: RED,
    backgroundColor: PALE_RED,
  },

  pinInput: {
    flex: 1,
    minHeight: 41,
    paddingVertical: 0,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 5,
    color: colors.navy,
  },

  pinCount: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSub,
    fontVariant: ["tabular-nums"],
  },

  fieldDivider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 11,
  },

  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },

  fieldErrorText: {
    flex: 1,
    fontSize: 11,
    color: RED,
    lineHeight: 16,
  },

  // SAVE ERROR

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_RED,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 9,
  },

  errorBannerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: RED,
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