
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, sizing } from "@/utils/theme";
import { useRouter } from "expo-router";
import { addBeneficiary } from "@/services/beneficiaryService";
import { BeneficiaryResponse } from "@/types/beneficiary";
import VerifyPinModal from "@/components/VerifyPinModal";
import SuccessModal from "@/components/SuccessModal";

// ─────────────────────────────────────────────
// BANK DATA — EXISTING VALUES PRESERVED
// Branch codes must be verified before production.
// ─────────────────────────────────────────────

type Bank = {
  name: string;
  branchCode: string;
};

const banks: Bank[] = [
  { name: "ABSA", branchCode: "632005" },
  { name: "FNB", branchCode: "255005" },
  { name: "Nedbank", branchCode: "198765" },
  { name: "Standard Bank", branchCode: "051001" },
  { name: "Capitec Bank", branchCode: "470010" },
  { name: "TymeBank", branchCode: "678900" },
  { name: "Discovery Bank", branchCode: "123456" },
  { name: "Bank Zero", branchCode: "789012" },
  { name: "African Bank", branchCode: "430000" },
  { name: "Investec", branchCode: "580105" },
  { name: "Sasfin", branchCode: "612100" },
  { name: "Bidvest Bank", branchCode: "462005" },
  { name: "Grindrod Bank", branchCode: "660000" },
];

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

const validateAccountNumber = (num: string): string => {
  const trimmed = num.trim();

  if (!trimmed) return "Account number is required";
  if (!/^\d+$/.test(trimmed)) return "Digits only";
  if (trimmed.length !== 16) return "Must be exactly 16 digits";

  return "";
};

const validateBranchCode = (code: string): string => {
  const trimmed = code.trim();

  if (trimmed.length === 0) return "";
  if (!/^\d+$/.test(trimmed)) return "Digits only";
  if (trimmed.length > 6) return "Maximum 6 digits";

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

export default function AddBankAccount() {
  const router = useRouter();

  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [reference, setReference] = useState("");

  // Existing UI-only preferences.
  const [oneTime, setOneTime] = useState(false);
  const notification = "None";

  const [nameError, setNameError] = useState("");
  const [accountError, setAccountError] = useState("");
  const [bankError, setBankError] = useState("");
  const [branchError, setBranchError] = useState("");
  const [referenceError, setReferenceError] = useState("");

  const [nameTouched, setNameTouched] = useState(false);
  const [accountTouched, setAccountTouched] = useState(false);
  const [bankTouched, setBankTouched] = useState(false);
  const [branchTouched, setBranchTouched] = useState(false);
  const [referenceTouched, setReferenceTouched] =
    useState(false);

  const [focusedField, setFocusedField] = useState<
    "name" | "account" | "branch" | "reference" | null
  >(null);

  const [modalVisible, setModalVisible] = useState(false);

  const [verifyVisible, setVerifyVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [createdBeneficiary, setCreatedBeneficiary] =
    useState<BeneficiaryResponse | null>(null);

  // ───────────────────────────────────────────
  // VALIDATION
  // ───────────────────────────────────────────

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const clearGeneralError = () => {
    if (error) {
      setError(null);
      setShowErrorModal(false);
    }
  };

  const isFormValid = () => {
    return (
      !validateName(beneficiaryName) &&
      !validateAccountNumber(accountNumber) &&
      !!selectedBank &&
      !validateBranchCode(branchCode) &&
      !validateReference(reference)
    );
  };

  const validateAll = (): boolean => {
    const nameErr = validateName(beneficiaryName);
    const accErr = validateAccountNumber(accountNumber);
    const bankErr = selectedBank
      ? ""
      : "Please select a bank";
    const branchErr = validateBranchCode(branchCode);
    const refErr = validateReference(reference);

    setNameError(nameErr);
    setAccountError(accErr);
    setBankError(bankErr);
    setBranchError(branchErr);
    setReferenceError(refErr);

    setNameTouched(true);
    setAccountTouched(true);
    setBankTouched(true);
    setBranchTouched(true);
    setReferenceTouched(true);

    return !nameErr && !accErr && !bankErr &&
      !branchErr && !refErr;
  };

  // ───────────────────────────────────────────
  // FIELD HANDLERS
  // ───────────────────────────────────────────

  const handleNameChange = (text: string) => {
    setBeneficiaryName(text);
    setNameError(validateName(text));
    clearGeneralError();
  };

  const handleAccountChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 16);

    setAccountNumber(digits);
    setAccountError(validateAccountNumber(digits));
    clearGeneralError();
  };

  const handleBranchChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 6);

    setBranchCode(digits);
    setBranchError(validateBranchCode(digits));
    clearGeneralError();
  };

  const handleReferenceChange = (text: string) => {
    setReference(text);
    setReferenceError(validateReference(text));
    clearGeneralError();
  };

  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank.name);
    setBranchCode(bank.branchCode);
    setBankError("");
    setBranchError("");
    setBankTouched(false);
    setModalVisible(false);
    clearGeneralError();
  };

  // ───────────────────────────────────────────
  // SUBMISSION — EXISTING LOGIC PRESERVED
  // ───────────────────────────────────────────

  const handleSubmit = () => {
    if (!validateAll()) return;

    Keyboard.dismiss();
    setVerifyVisible(true);
  };

  const handleVerifiedSubmit = async () => {
    setVerifyVisible(false);

    try {
      setSaving(true);
      setError(null);

      const created = await addBeneficiary({
        name: beneficiaryName.trim(),
        bankName: selectedBank,
        accountNumber: accountNumber.trim(),
        reference:
          reference.trim() || beneficiaryName.trim(),
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
  // BANK SELECTION ROW
  // ───────────────────────────────────────────

  const renderBankItem = ({ item }: { item: Bank }) => {
    const isSelected = selectedBank === item.name;

    return (
      <TouchableOpacity
        style={[
          styles.bankItem,
          isSelected && styles.bankItemSelected,
        ]}
        onPress={() => handleBankSelect(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.bankIcon}>
          <Ionicons
            name="business-outline"
            size={19}
            color={colors.primaryDark}
          />
        </View>

        <Text style={styles.bankItemText}>
          {item.name}
        </Text>

        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={21}
            color={colors.primary}
          />
        )}
      </TouchableOpacity>
    );
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

      {/* PURPLE HEADER */}

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
            BANK ACCOUNT
          </Text>

          <Text style={styles.headerHeading}>
            Recipient details
          </Text>

          <Text style={styles.headerDescription}>
            Add a beneficiary using their bank account details.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="business-outline"
              size={16}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            Bank account beneficiary
          </Text>
        </View>
      </View>

      {/* FORM */}

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* SECTION HEADING */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Beneficiary information
            </Text>

            <Text style={styles.sectionDescription}>
              Enter the recipient's banking details below.
            </Text>
          </View>

          {/* IMPORTANT INFORMATION */}

          <View style={styles.infoBanner}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.primaryDark}
              style={styles.infoIcon}
            />

            <Text style={styles.infoText}>
              Check all beneficiary details carefully
              before making a payment. This form does
              not confirm account ownership.
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
                value={beneficiaryName}
                onChangeText={handleNameChange}
                onFocus={() => setFocusedField("name")}
                onBlur={() => {
                  setFocusedField(null);
                  setNameTouched(true);
                  setNameError(
                    validateName(beneficiaryName)
                  );
                }}
                placeholder="Enter beneficiary name"
                placeholderTextColor={colors.textLight}
                maxLength={25}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Beneficiary name"
              />
            </View>

            {nameTouched && !!nameError && (
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
            )}
          </View>

          {/* ACCOUNT NUMBER */}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Account number
              <Text style={styles.required}> *</Text>
            </Text>

            <View
              style={[
                styles.inputContainer,
                focusedField === "account" &&
                  styles.inputFocused,
                accountTouched &&
                  !!accountError &&
                  styles.inputInvalid,
              ]}
            >
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={handleAccountChange}
                onFocus={() => setFocusedField("account")}
                onBlur={() => {
                  setFocusedField(null);
                  setAccountTouched(true);
                  setAccountError(
                    validateAccountNumber(accountNumber)
                  );
                }}
                keyboardType="number-pad"
                placeholder="Enter account number"
                placeholderTextColor={colors.textLight}
                maxLength={16}
                accessibilityLabel="Account number"
              />
            </View>

            {accountTouched && !!accountError ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color={colors.dangerStrong}
                />

                <Text style={styles.fieldError}>
                  {accountError}
                </Text>
              </View>
            ) : (
              <Text style={styles.fieldHint}>
                Enter the recipient's bank account number.
              </Text>
            )}
          </View>

          {/* BANK SELECTION */}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Choose bank
              <Text style={styles.required}> *</Text>
            </Text>

            <TouchableOpacity
              style={[
                styles.inputContainer,
                styles.selectContainer,
                bankTouched &&
                  !!bankError &&
                  styles.inputInvalid,
              ]}
              onPress={() => {
                Keyboard.dismiss();
                setModalVisible(true);
                setBankTouched(true);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Choose bank"
            >
              <Text
                style={[
                  styles.selectText,
                  !selectedBank && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {selectedBank || "Select bank"}
              </Text>

              <Ionicons
                name="chevron-down"
                size={19}
                color={colors.textSub}
              />
            </TouchableOpacity>

            {bankTouched && !!bankError && (
              <View style={styles.fieldErrorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color={colors.dangerStrong}
                />

                <Text style={styles.fieldError}>
                  {bankError}
                </Text>
              </View>
            )}
          </View>

          {/* BRANCH CODE */}

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                Branch code
              </Text>

              <Text style={styles.optionalLabel}>
                OPTIONAL
              </Text>
            </View>

            <View
              style={[
                styles.inputContainer,
                focusedField === "branch" &&
                  styles.inputFocused,
                branchTouched &&
                  !!branchError &&
                  styles.inputInvalid,
              ]}
            >
              <TextInput
                style={styles.input}
                value={branchCode}
                onChangeText={handleBranchChange}
                onFocus={() => setFocusedField("branch")}
                onBlur={() => {
                  setFocusedField(null);
                  setBranchTouched(true);
                  setBranchError(
                    validateBranchCode(branchCode)
                  );
                }}
                keyboardType="number-pad"
                placeholder="Enter branch code"
                placeholderTextColor={colors.textLight}
                maxLength={6}
                accessibilityLabel="Branch code"
              />
            </View>

            {branchTouched && !!branchError ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color={colors.dangerStrong}
                />

                <Text style={styles.fieldError}>
                  {branchError}
                </Text>
              </View>
            ) : (
              <Text style={styles.fieldHint}>
                Auto-filled when you select a bank.
                Not included in the current save request.
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

          {/* PAYMENT PREFERENCES */}

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

          {/* GENERAL ERROR */}

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

          {/* PRIMARY ACTION */}

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

      {/* EXISTING PIN VERIFICATION */}

      <VerifyPinModal
        visible={verifyVisible}
        onCancel={() => setVerifyVisible(false)}
        onVerified={handleVerifiedSubmit}
        subtitle="Enter your PIN to add this beneficiary"
      />

      {/* EXISTING SUCCESS FLOW */}

      <SuccessModal
        visible={!!createdBeneficiary}
        title="Beneficiary added"
        message={`${
          createdBeneficiary?.name ?? "Your beneficiary"
        } has been added to your beneficiaries. You can now make payments to them.`}
        secondaryLabel="View list"
        onSecondaryPress={() =>
          router.replace("/beneficiaries/beneficiary-list")
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

      {/* ERROR MODAL */}

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

      {/* BANK SELECTION BOTTOM SHEET */}

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.bankModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close bank selection"
          />

          <View style={styles.bankSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.bankModalHeader}>
              <View style={styles.bankModalTitleGroup}>
                <Text style={styles.bankModalEyebrow}>
                  BANK SELECTION
                </Text>

                <Text style={styles.bankModalTitle}>
                  Choose your bank
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={colors.navy}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.bankModalDescription}>
              Select the bank where the recipient holds
              their account.
            </Text>

            <FlatList
              data={banks}
              keyExtractor={(item) => item.name}
              renderItem={renderBankItem}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.bankListContent
              }
            />
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

  // PURPLE HEADER

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

  // FORM CONTAINER

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

  // SECTION HEADING

  sectionHeader: {
    marginBottom: spacing.xl,
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

  // INFORMATION BANNER

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
  },

  infoIcon: {
    marginTop: 1,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
  },

  // FORM FIELDS

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

  selectContainer: {
    justifyContent: "space-between",
  },

  selectText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "500",
    color: colors.navy,
  },

  placeholderText: {
    color: colors.textLight,
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

  // PAYMENT PREFERENCES

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

  // PRIMARY ACTION

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

  // ERROR BANNER

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

  // SHARED MODAL OVERLAY

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },

  // ERROR MODAL

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

  // BANK SELECTION BOTTOM SHEET

  bankModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.55)",
  },

  bankSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.md,
    maxHeight: "78%",
  },

  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.greyLine,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.xl,
  },

  bankModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },

  bankModalTitleGroup: {
    flex: 1,
  },

  bankModalEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
    letterSpacing: 0.7,
    marginBottom: 5,
  },

  bankModalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },

  bankModalDescription: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 19,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },

  bankListContent: {
    paddingBottom: spacing.xxxl,
  },

  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.greyLine,
    backgroundColor: colors.white,
    gap: spacing.md,
  },

  bankItemSelected: {
    backgroundColor: colors.primarySubtle,
  },

  bankIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySubtle,
  },

  bankItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },
});