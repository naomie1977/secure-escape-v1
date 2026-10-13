
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, sizing } from "@/utils/theme";
import { useRouter } from "expo-router";
import { addBeneficiary } from "@/services/beneficiaryService";
import { BeneficiaryResponse } from "@/types/beneficiary";
import VerifyPinModal from "@/components/VerifyPinModal";
import SuccessModal from "@/components/SuccessModal";

// ─────────────────────────────────────────────
// EXISTING VALIDATION
// ─────────────────────────────────────────────

const validateName = (name: string): string => {
  const trimmed = name.trim();

  if (!trimmed) return "Beneficiary name is required";
  if (trimmed.length < 2) return "Minimum 2 characters";
  if (trimmed.length > 25) return "Maximum 25 characters";

  if (!/^[A-Za-z\s\-']+$/.test(trimmed)) {
    return "Only letters, spaces, hyphens, and apostrophes";
  }

  return "";
};

const validatePhone = (phone: string): string => {
  const trimmed = phone.trim();

  if (!trimmed) return "Cellphone number is required";

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length !== 10) {
    return "Must be exactly 10 digits";
  }

  if (!digits.startsWith("0")) {
    return "Must start with 0 (e.g., 0821234567)";
  }

  return "";
};

const validateReference = (ref: string): string => {
  const trimmed = ref.trim();

  if (trimmed.length === 0) return "";
  if (trimmed.length > 25) return "Maximum 25 characters";

  if (!/^[A-Za-z0-9\s\-_]+$/.test(trimmed)) {
    return "No special characters allowed";
  }

  return "";
};

// ─────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────

export default function AddBeneficiaryForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");

  const [oneTime, setOneTime] = useState(false);

  // Existing UI-only notification setting.
  const [notification] = useState("None");

  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [referenceError, setReferenceError] = useState("");

  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [referenceTouched, setReferenceTouched] =
    useState(false);

  const [focusedField, setFocusedField] = useState<
    "name" | "phone" | "reference" | null
  >(null);

  const [verifyVisible, setVerifyVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] =
    useState(false);

  const [createdBeneficiary, setCreatedBeneficiary] =
    useState<BeneficiaryResponse | null>(null);

  // ───────────────────────────────────────────
  // VALIDATION & SUBMISSION
  // ───────────────────────────────────────────

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const isFormValid = () => {
    return (
      !validateName(name) &&
      !validatePhone(phone) &&
      !validateReference(reference)
    );
  };

  const validateAll = (): boolean => {
    const nameErr = validateName(name);
    const phoneErr = validatePhone(phone);
    const refErr = validateReference(reference);

    setNameError(nameErr);
    setPhoneError(phoneErr);
    setReferenceError(refErr);

    setNameTouched(true);
    setPhoneTouched(true);
    setReferenceTouched(true);

    return !nameErr && !phoneErr && !refErr;
  };

  const clearGeneralError = () => {
    if (error) {
      setError(null);
      setShowErrorModal(false);
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setNameError(validateName(text));
    clearGeneralError();
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    setPhoneError(validatePhone(text));
    clearGeneralError();
  };

  const handleReferenceChange = (text: string) => {
    setReference(text);
    setReferenceError(validateReference(text));
    clearGeneralError();
  };

  const handleSubmit = () => {
    if (!validateAll()) {
      return;
    }

    setVerifyVisible(true);
  };

  const handleVerifiedSubmit = async () => {
    setVerifyVisible(false);

    try {
      setSaving(true);
      setError(null);

      const digits = phone.replace(/\D/g, "");

      const created = await addBeneficiary({
        name: name.trim(),
        bankName: "Capitec",
        accountNumber: digits,
        reference: reference.trim() || name.trim(),
      });

      setCreatedBeneficiary(created);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Please try again.";

      showError(message);
    } finally {
      setSaving(false);
    }
  };

  // ───────────────────────────────────────────
  // MAIN UI
  // ───────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
      />

      {/* ─────────────────────────────
          PURPLE HEADER
      ───────────────────────────── */}

      <View style={styles.header}>
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.white}
            />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>
            Add beneficiary
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            CAPITEC CELLPHONE
          </Text>

          <Text style={styles.headerHeading}>
            Recipient details
          </Text>

          <Text style={styles.headerDescription}>
            Add a Capitec client using their cellphone number.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="phone-portrait-outline"
              size={16}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            Cellphone beneficiary
          </Text>
        </View>
      </View>

      {/* ─────────────────────────────
          FORM
      ───────────────────────────── */}

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
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
          {/* SECTION TITLE */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Beneficiary information
            </Text>

            <Text style={styles.sectionDescription}>
              Enter the recipient's details below.
            </Text>
          </View>

          {/* BENEFICIARY NAME */}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Beneficiary name
              <Text style={styles.required}> *</Text>
            </Text>

            <View
              style={[
                styles.inputContainer,
                focusedField === "name" &&
                  styles.inputFocused,
                nameTouched &&
                  !!nameError &&
                  styles.inputInvalid,
              ]}
            >
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={handleNameChange}
                onFocus={() => setFocusedField("name")}
                onBlur={() => {
                  setFocusedField(null);
                  setNameTouched(true);
                  setNameError(validateName(name));
                }}
                placeholder="Enter beneficiary name"
                placeholderTextColor={colors.textLight}
                maxLength={25}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Beneficiary name"
              />
            </View>

            {nameTouched && !!nameError ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color={colors.dangerStrong}
                />

                <Text style={styles.fieldError}>
                  {nameError}
                </Text>
              </View>
            ) : null}
          </View>

          {/* CELLPHONE NUMBER */}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Cellphone number
              <Text style={styles.required}> *</Text>
            </Text>

            <View
              style={[
                styles.inputContainer,
                focusedField === "phone" &&
                  styles.inputFocused,
                phoneTouched &&
                  !!phoneError &&
                  styles.inputInvalid,
              ]}
            >
              <View style={styles.inputPrefix}>
                <Ionicons
                  name="call-outline"
                  size={17}
                  color={colors.textSub}
                />
              </View>

              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => {
                  setFocusedField(null);
                  setPhoneTouched(true);
                  setPhoneError(validatePhone(phone));
                }}
                keyboardType="phone-pad"
                placeholder="082 123 4567"
                placeholderTextColor={colors.textLight}
                maxLength={10}
                autoComplete="tel"
                accessibilityLabel="Cellphone number"
              />
            </View>

            {phoneTouched && !!phoneError ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color={colors.dangerStrong}
                />

                <Text style={styles.fieldError}>
                  {phoneError}
                </Text>
              </View>
            ) : (
              <Text style={styles.fieldHint}>
                Enter the 10-digit South African cellphone number.
              </Text>
            )}
          </View>

          {/* BENEFICIARY REFERENCE */}

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                Beneficiary reference
              </Text>

              <Text style={styles.optionalLabel}>
                OPTIONAL
              </Text>
            </View>

            <View
              style={[
                styles.inputContainer,
                focusedField === "reference" &&
                  styles.inputFocused,
                referenceTouched &&
                  !!referenceError &&
                  styles.inputInvalid,
              ]}
            >
              <TextInput
                style={styles.input}
                value={reference}
                onChangeText={handleReferenceChange}
                onFocus={() =>
                  setFocusedField("reference")
                }
                onBlur={() => {
                  setFocusedField(null);
                  setReferenceTouched(true);
                  setReferenceError(
                    validateReference(reference)
                  );
                }}
                placeholder="Enter a reference"
                placeholderTextColor={colors.textLight}
                maxLength={25}
                autoCapitalize="characters"
                accessibilityLabel="Beneficiary reference"
              />
            </View>

            {referenceTouched && !!referenceError ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color={colors.dangerStrong}
                />

                <Text style={styles.fieldError}>
                  {referenceError}
                </Text>
              </View>
            ) : (
              <Text style={styles.fieldHint}>
                Leave blank to use the beneficiary's name.
              </Text>
            )}
          </View>

          {/* ─────────────────────────
              PAYMENT PREFERENCES
          ───────────────────────── */}

          <View style={styles.preferencesSection}>
            <Text style={styles.preferencesTitle}>
              Payment preferences
            </Text>

            <Text style={styles.preferencesDescription}>
              Additional payment options
            </Text>
          </View>

          {/* ONE-TIME BENEFICIARY */}

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>
                One-time beneficiary
              </Text>

              <Text style={styles.preferenceDescription}>
                Used for a once-off payment
              </Text>

              <Text style={styles.unavailableHint}>
                Not yet applied when saving
              </Text>
            </View>

            <Switch
              value={oneTime}
              onValueChange={setOneTime}
              trackColor={{
                false: "#D5D9E2",
                true: colors.primary,
              }}
              thumbColor={colors.white}
              accessibilityLabel="One-time beneficiary"
            />
          </View>

          {/* PAYMENT NOTIFICATION */}

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>
                Payment notification
              </Text>

              <Text style={styles.preferenceDescription}>
                Notification preference
              </Text>
            </View>

            <View style={styles.notificationValue}>
              <Text style={styles.notificationText}>
                {notification}
              </Text>
            </View>
          </View>

          {/* ERROR BANNER */}

          {!!error && (
            <TouchableOpacity
              style={styles.errorBanner}
              activeOpacity={0.8}
              onPress={() => setShowErrorModal(true)}
              accessibilityRole="button"
              accessibilityLabel="View error details"
            >
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={colors.dangerStrong}
              />

              <Text style={styles.errorBannerText}>
                {error}
              </Text>
            </TouchableOpacity>
          )}

          {/* ─────────────────────────
              PRIMARY ACTION
          ───────────────────────── */}

          {!createdBeneficiary && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isFormValid() || saving) &&
                    styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid() || saving}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Add beneficiary"
                accessibilityState={{
                  disabled: !isFormValid() || saving,
                  busy: saving,
                }}
              >
                {saving ? (
                  <ActivityIndicator
                    color={colors.white}
                  />
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      Add beneficiary
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.white}
                    />
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.actionHint}>
                You'll be asked to verify your PIN
                before the beneficiary is added.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─────────────────────────────
          EXISTING PIN VERIFICATION
      ───────────────────────────── */}

      <VerifyPinModal
        visible={verifyVisible}
        onCancel={() => setVerifyVisible(false)}
        onVerified={handleVerifiedSubmit}
        subtitle="Enter your PIN to add this beneficiary"
      />

      {/* ─────────────────────────────
          EXISTING SUCCESS FLOW
      ───────────────────────────── */}

      <SuccessModal
        visible={!!createdBeneficiary}
        title="Beneficiary added"
        message={`${
          createdBeneficiary?.name ?? "Your beneficiary"
        } has been added to your beneficiaries. You can now make payments to them.`}
        secondaryLabel="View list"
        onSecondaryPress={() =>
          router.replace(
            "/beneficiaries/beneficiary-list"
          )
        }
        primaryLabel="Pay now"
        onPrimaryPress={() => {
          if (!createdBeneficiary) return;

          router.push({
            pathname: "/transactions/create-transfer",
            params: {
              beneficiaryId: createdBeneficiary.id,
              beneficiaryName: createdBeneficiary.name,
              reference: createdBeneficiary.reference,
            },
          });
        }}
      />

      {/* ─────────────────────────────
          ERROR MODAL
      ───────────────────────────── */}

      <Modal
        transparent
        visible={showErrorModal && !!error}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setShowErrorModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModal}>
            <View style={styles.modalIconCircle}>
              <Ionicons
                name="alert-circle-outline"
                size={29}
                color={colors.dangerStrong}
              />
            </View>

            <Text style={styles.modalTitle}>
              Could not continue
            </Text>

            <Text style={styles.modalMessage}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={() =>
                setShowErrorModal(false)
              }
              accessibilityRole="button"
            >
              <Text style={styles.modalButtonText}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // ─────────────────────────
  // PURPLE HEADER
  // ─────────────────────────

  header: {
    backgroundColor: colors.primaryDark,
  },

  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 24) + 8
        : 56,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },

  backButton: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
  },

  appBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
  },

  appBarSpacer: {
    width: sizing.touchTarget,
  },

  headerContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E4E1FF",
    letterSpacing: 0.7,
    marginBottom: spacing.md,
  },

  headerHeading: {
    fontSize: 29,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  headerDescription: {
    fontSize: 13,
    color: "#E4E1FF",
    marginTop: spacing.sm,
    lineHeight: 19,
    maxWidth: 300,
  },

  headerDivider: {
    display: "none",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
    marginHorizontal: spacing.xxl,
  },

  headerFooter: {
    display: "none",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },

  headerFooterIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerFooterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E4E1FF",
  },

  // ─────────────────────────
  // FORM CONTAINER
  // ─────────────────────────

  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },

  // ─────────────────────────
  // SECTION HEADING
  // ─────────────────────────

  sectionHeader: {
    marginBottom: spacing.xxl,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  sectionDescription: {
    fontSize: 13,
    color: colors.textSub,
    marginTop: spacing.xs,
    lineHeight: 19,
  },

  // ─────────────────────────
  // FORM FIELDS
  // ─────────────────────────

  fieldGroup: {
    marginBottom: spacing.xl,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: spacing.sm,
  },

  required: {
    color: colors.dangerStrong,
    fontWeight: "700",
  },

  optionalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.4,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },

  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },

  inputInvalid: {
    borderColor: colors.dangerStrong,
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 15,
    fontWeight: "500",
    color: colors.navy,
  },

  inputPrefix: {
    marginRight: spacing.md,
    paddingRight: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.greyLine,
    height: 23,
    justifyContent: "center",
  },

  fieldHint: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: 5,
  },

  fieldError: {
    flex: 1,
    fontSize: 12,
    color: colors.dangerStrong,
    lineHeight: 17,
  },

  // ─────────────────────────
  // PAYMENT PREFERENCES
  // ─────────────────────────

  preferencesSection: {
    paddingTop: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.greyLine,
  },

  preferencesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },

  preferencesDescription: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 4,
  },

  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 74,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
    gap: spacing.md,
  },

  preferenceInfo: {
    flex: 1,
    minWidth: 0,
  },

  preferenceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },

  preferenceDescription: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 4,
    lineHeight: 17,
  },

  unavailableHint: {
    fontSize: 11,
    color: colors.textSub,
    marginTop: 4,
    fontStyle: "italic",
  },

  notificationValue: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },

  notificationText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSub,
  },

  // ─────────────────────────
  // PRIMARY ACTION
  // ─────────────────────────

  actionSection: {
    marginTop: spacing.xxxl,
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    gap: spacing.sm,
  },

  disabledButton: {
    opacity: 0.5,
  },

  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },

  actionHint: {
    fontSize: 12,
    color: colors.textSub,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 18,
  },

  // ─────────────────────────
  // ERROR BANNER
  // ─────────────────────────

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.md,
    backgroundColor: colors.dangerBg,
    gap: spacing.sm,
  },

  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.dangerStrong,
    lineHeight: 18,
  },

  // ─────────────────────────
  // ERROR MODAL
  // ─────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },

  errorModal: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    alignItems: "center",
  },

  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
  },

  modalMessage: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 20,
  },

  modalButton: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    marginTop: spacing.xxl,
  },

  modalButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});