// screens/transaction/CreateTransfer.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
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
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import VerifyPinModal from "@/components/VerifyPinModal";
import SuccessModal from "@/components/SuccessModal";
import { getAccounts } from "@/services/accountService";
import { createTransfer } from "@/services/transactionServices";
import { getSessionMode } from "@/services/tokenStore";
import { AccountResponse } from "@/types/account";
import { TransactionResponse } from "@/types/transaction";
import { colors, spacing, radii, sizing } from "@/utils/theme";

const validateDescription = (desc: string): string => {
  const trimmed = desc.trim();

  if (!trimmed) {
    return "Reference is required";
  }

  if (trimmed.length < 2) {
    return "Minimum 2 characters";
  }

  if (trimmed.length > 50) {
    return "Maximum 50 characters";
  }

  return "";
};

const formatCurrency = (value: number) =>
  `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "?";

export default function CreateTransfer() {
  const router = useRouter();

  const { beneficiaryId, beneficiaryName, reference } =
    useLocalSearchParams<{
      beneficiaryId?: string;
      beneficiaryName?: string;
      reference?: string;
    }>();

  const [verifyVisible, setVerifyVisible] = useState(false);

  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState(reference ?? "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [createdTransaction, setCreatedTransaction] =
    useState<TransactionResponse | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] =
    useState(false);

  const [accountModalVisible, setAccountModalVisible] =
    useState(false);

  const [amountError, setAmountError] = useState("");
  const [descError, setDescError] = useState("");

  const notification = "None"; // UI only

  useEffect(() => {
    loadAccounts();
  }, []);

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.status === "Active",
      ),
    [accounts],
  );

  const selectedAccount = activeAccounts.find(
    (account) => account.id === selectedAccountId,
  );

  const displayBeneficiaryName =
    typeof beneficiaryName === "string"
      ? beneficiaryName.trim()
      : "";

  const displayBeneficiaryReference =
    typeof reference === "string" ? reference.trim() : "";

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const clearError = () => {
    setError(null);
    setShowErrorModal(false);
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);

      const data = await getAccounts();
      setAccounts(data);

      const firstActive = data.find(
        (account) => account.status === "Active",
      );

      if (firstActive) {
        setSelectedAccountId(firstActive.id);
      }
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const validateAmountValue = (
    value: string,
  ): string => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "Amount is required";
    }

    const numeric = Number(trimmed);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "Enter a valid amount";
    }

    if (
      selectedAccount &&
      numeric > selectedAccount.availableBalance
    ) {
      return `Exceeds balance of R ${selectedAccount.availableBalance.toLocaleString()}`;
    }

    return "";
  };

  const validateAmount = (value: string) => {
    const message = validateAmountValue(value);
    setAmountError(message);

    return !message;
  };

  const handleAmountChange = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, "");

    if ((cleaned.match(/\./g) || []).length > 1) {
      return;
    }

    const decimalIndex = cleaned.indexOf(".");

    if (decimalIndex >= 0) {
      const whole = cleaned.slice(0, decimalIndex);
      const decimals = cleaned
        .slice(decimalIndex + 1)
        .slice(0, 2);

      cleaned = `${whole}.${decimals}`;
    }

    setAmount(cleaned);
    validateAmount(cleaned);
    clearError();
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    setDescError(validateDescription(text));
    clearError();
  };

  const validateAll = (): {
    valid: boolean;
    message: string;
  } => {
    if (!beneficiaryId) {
      return {
        valid: false,
        message: "Please choose a beneficiary first.",
      };
    }

    if (!selectedAccountId) {
      return {
        valid: false,
        message: "Please choose an account.",
      };
    }

    const currentAmountError =
      validateAmountValue(amount);

    const currentDescriptionError =
      validateDescription(description);

    setAmountError(currentAmountError);
    setDescError(currentDescriptionError);

    if (currentAmountError) {
      return {
        valid: false,
        message: currentAmountError,
      };
    }

    if (currentDescriptionError) {
      return {
        valid: false,
        message: currentDescriptionError,
      };
    }

    return {
      valid: true,
      message: "",
    };
  };

  const handlePayPress = async () => {
    const validation = validateAll();

    if (!validation.valid) {
      showError(validation.message);
      return;
    }

    const numericAmount = Number(amount);

    try {
      const sessionMode = await getSessionMode();
      const isDuress = sessionMode === "Duress";

      if (isDuress) {
        router.push({
          pathname: "/transactions/selfie-verification",
          params: {
            beneficiaryId,
            beneficiaryName:
              displayBeneficiaryName || "",
            reference: description.trim(),
            amount: numericAmount.toString(),
            accountId: selectedAccountId,
            accountName:
              selectedAccount?.accountName || "",
          },
        });

        return;
      }

      setConfirmModalVisible(true);
    } catch {
      showError(
        "Unable to verify your session. Please try again.",
      );
    }
  };

  const confirmPayment = () => {
    setConfirmModalVisible(false);
    setVerifyVisible(true);
  };

  const handleVerifiedSubmit = async () => {
    setVerifyVisible(false);

    try {
      setSaving(true);
      clearError();

      if (!beneficiaryId) {
        showError("Beneficiary information is missing.");
        return;
      }

      const transaction = await createTransfer({
        bankAccountId: selectedAccountId,
        beneficiaryId,
        amount: Number(amount),
        description: description.trim(),
      });

      if (
        transaction.status === "Failed" ||
        transaction.status === "Blocked"
      ) {
        showError(
          transaction.statusReason ||
            "This transfer could not be processed. Please try again.",
        );

        return;
      }

      setCreatedTransaction(transaction);
      await loadAccounts();
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderAccountItem = ({
    item,
  }: {
    item: AccountResponse;
  }) => {
    const selected = selectedAccountId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.accountItem,
          selected && styles.selectedAccountItem,
        ]}
        onPress={() => {
          setSelectedAccountId(item.id);
          setAccountModalVisible(false);

          if (amount) {
            const numeric = Number(amount);

            if (
              Number.isFinite(numeric) &&
              numeric > item.availableBalance
            ) {
              setAmountError(
                `Exceeds balance of R ${item.availableBalance.toLocaleString()}`,
              );
            } else {
              setAmountError("");
            }
          }

          clearError();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.accountItemIcon}>
          <Ionicons
            name="wallet-outline"
            size={19}
            color="#25145F"
          />
        </View>

        <View style={styles.accountItemInfo}>
          <Text style={styles.accountItemName} numberOfLines={1}>
            {item.accountName}
          </Text>

          <Text style={styles.accountItemNumber} numberOfLines={1}>
            {item.accountNumber}
          </Text>

          <Text style={styles.accountItemBalance}>
            {formatCurrency(item.availableBalance)}
            <Text style={styles.accountItemBalanceCaption}> available</Text>
          </Text>
        </View>

        <Ionicons
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={selected ? "#25145F" : "#CBD5E1"}
        />
      </TouchableOpacity>
    );
  };

  const amountNumber = Number(amount) || 0;

  const exceedsBalance =
    !!selectedAccount &&
    amountNumber > selectedAccount.availableBalance;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#25145F"
      />

      {/* DEEP-PURPLE HEADER */}
      <View style={styles.header}>
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>Pay beneficiary</Text>
          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>MAKE A PAYMENT</Text>
          <Text style={styles.headerHeading}>Payment details</Text>
          <Text style={styles.headerDescription}>
            Review your recipient and enter the amount you'd like to pay.
          </Text>
        </View>
      </View>

      {/* MAIN CONTENT */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* PAYMENT RECIPIENT */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment recipient</Text>
            <Text style={styles.sectionDescription}>
              Check who you're sending money to.
            </Text>
          </View>

          <View style={styles.recipientCard}>
            <View style={styles.recipientTop}>
              <View style={styles.recipientAvatar}>
                <Text style={styles.recipientInitials}>
                  {getInitials(displayBeneficiaryName || "Beneficiary")}
                </Text>
              </View>

              <View style={styles.recipientInfo}>
                <Text style={styles.recipientEyebrow}>BENEFICIARY</Text>
                <Text style={styles.recipientName} numberOfLines={2}>
                  {displayBeneficiaryName || "Selected beneficiary"}
                </Text>
              </View>

              <Ionicons
                name="person-outline"
                size={19}
                color="#64748B"
              />
            </View>

            {!!displayBeneficiaryReference && (
              <>
                <View style={styles.recipientDivider} />
                <View style={styles.recipientDetailRow}>
                  <Text style={styles.recipientDetailLabel}>
                    Beneficiary reference
                  </Text>
                  <Text style={styles.recipientDetailValue} numberOfLines={2}>
                    {displayBeneficiaryReference}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* FROM ACCOUNT */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              From account <Text style={styles.required}>*</Text>
            </Text>

            <TouchableOpacity
              style={styles.accountSelector}
              onPress={() => {
                Keyboard.dismiss();
                setAccountModalVisible(true);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.selectorIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={19}
                  color="#25145F"
                />
              </View>

              {loading ? (
                <View style={styles.selectorContent}>
                  <ActivityIndicator color="#25145F" size="small" />
                </View>
              ) : selectedAccount ? (
                <View style={styles.selectorContent}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {selectedAccount.accountName}
                  </Text>
                  <Text style={styles.accountMeta} numberOfLines={1}>
                    {formatCurrency(selectedAccount.availableBalance)} available
                  </Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select account</Text>
              )}

              <Ionicons name="chevron-down" size={19} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* AMOUNT */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Amount <Text style={styles.required}>*</Text>
            </Text>

            <View
              style={[
                styles.amountWrapper,
                !!amountError && styles.inputError,
              ]}
            >
              <Text style={styles.currencySymbol}>R</Text>
              <View style={styles.currencyDivider} />
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                value={amount}
                onChangeText={handleAmountChange}
              />
            </View>

            {amountError ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color="#EF4444"
                />
                <Text style={styles.fieldError}>{amountError}</Text>
              </View>
            ) : amount.trim() !== "" && selectedAccount ? (
              <View style={styles.balanceHintRow}>
                <Text style={styles.balanceHintLabel}>Available balance</Text>
                <Text
                  style={[
                    styles.balanceHintValue,
                    exceedsBalance && styles.balanceError,
                  ]}
                >
                  {formatCurrency(selectedAccount.availableBalance)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* YOUR REFERENCE */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Your reference <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={[
                styles.input,
                !!descError && styles.inputError,
              ]}
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Enter your payment reference"
              placeholderTextColor="#94A3B8"
              maxLength={50}
            />

            {!!descError ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color="#EF4444"
                />
                <Text style={styles.fieldError}>{descError}</Text>
              </View>
            ) : (
              <Text style={styles.fieldHint}>
                This reference will appear on your statement.
              </Text>
            )}
          </View>

          {/* PAYMENT PREFERENCES */}
          <View style={styles.preferencesSection}>
            <Text style={styles.preferencesTitle}>Payment preferences</Text>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>Payment notification</Text>
                <Text style={styles.preferenceDescription}>
                  Notification preference
                </Text>
              </View>
              <View style={styles.notificationValue}>
                <Text style={styles.notificationText}>{notification}</Text>
              </View>
            </View>
          </View>

          {/* ERROR BANNER */}
          {!!error && (
            <TouchableOpacity
              style={styles.errorBanner}
              activeOpacity={0.8}
              onPress={() => setShowErrorModal(true)}
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#B91C1C"
              />
              <Text style={styles.errorBannerText}>{error}</Text>
            </TouchableOpacity>
          )}

          {/* PRIMARY ACTION */}
          {!createdTransaction && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (saving || !!amountError || !!descError) &&
                    styles.disabledButton,
                ]}
                onPress={handlePayPress}
                disabled={saving || !!amountError || !!descError}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Continue to payment</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.actionHint}>
                Review the payment details before confirming your transfer.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ACCOUNT SELECTION BOTTOM SHEET */}
      <Modal
        animationType="slide"
        transparent
        visible={accountModalVisible}
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setAccountModalVisible(false)}
          />
          <View style={styles.accountSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>SOURCE ACCOUNT</Text>
                <Text style={styles.sheetTitle}>Choose an account</Text>
              </View>

              <TouchableOpacity
                onPress={() => setAccountModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeAccounts}
              keyExtractor={(item) => item.id}
              renderItem={renderAccountItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </View>
        </View>
      </Modal>

      {/* PAYMENT CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={28}
                color="#25145F"
              />
            </View>

            <Text style={styles.confirmEyebrow}>PAYMENT CONFIRMATION</Text>
            <Text style={styles.confirmTitle}>Review your payment</Text>
            <Text style={styles.confirmDescription}>
              Check the details below before authorising your payment.
            </Text>

            <View style={styles.paymentSummary}>
              <Text style={styles.summaryAmountLabel}>PAYMENT AMOUNT</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(amountNumber)}
              </Text>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>To</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {displayBeneficiaryName || "Beneficiary"}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>From</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {selectedAccount?.accountName || "Account"}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Reference</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {description.trim()}
                </Text>
              </View>
            </View>

            <View style={styles.confirmNotice}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#25145F"
              />
              <Text style={styles.confirmNoticeText}>
                Only continue if you recognise and trust this payment recipient.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.confirmPrimaryButton}
              onPress={confirmPayment}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmPrimaryText}>Confirm payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={() => setConfirmModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PENDING TRANSACTION MODAL */}
      <Modal
        transparent
        animationType="fade"
        visible={createdTransaction?.status === "Pending"}
        onRequestClose={() => undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={[styles.confirmIconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time-outline" size={28} color="#D97706" />
            </View>

            <Text style={styles.confirmTitle}>Security verification</Text>
            <Text style={styles.confirmDescription}>
              For your security, this payment is pending additional verification.
              You can track its status in your transaction history.
            </Text>

            <TouchableOpacity
              style={styles.confirmPrimaryButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.confirmPrimaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <SuccessModal
        visible={
          !!createdTransaction && createdTransaction.status !== "Pending"
        }
        title="Payment complete"
        message={`You paid ${formatCurrency(
          Number(amount) || 0,
        )} to ${displayBeneficiaryName || "your beneficiary"}.`}
        primaryLabel="Done"
        onPrimaryPress={() => router.replace("/(tabs)")}
      />

      {/* PIN VERIFICATION */}
      <VerifyPinModal
        visible={verifyVisible}
        onCancel={() => setVerifyVisible(false)}
        onVerified={handleVerifiedSubmit}
        subtitle="Enter your PIN to send this transfer"
      />

      {/* ERROR MODAL */}
      <Modal
        transparent
        visible={showErrorModal && !!error}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModal}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="alert-circle" size={30} color="#DC2626" />
            </View>

            <Text style={styles.errorModalTitle}>Transfer failed</Text>
            <Text style={styles.modalMessage}>{error}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.85}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#25145F",
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
    color: "#FFFFFF",
    textAlign: "center",
  },
  appBarSpacer: {
    width: sizing.touchTarget,
  },
  headerContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E9D5FF",
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
  },
  headerHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  headerDescription: {
    fontSize: 13,
    color: "#E9D5FF",
    marginTop: spacing.xs,
    lineHeight: 18,
    maxWidth: 320,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 18,
  },
  recipientCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  recipientTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  recipientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  recipientInitials: {
    fontSize: 15,
    fontWeight: "800",
    color: "#25145F",
  },
  recipientInfo: {
    flex: 1,
    minWidth: 0,
  },
  recipientEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  recipientDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: spacing.md,
  },
  recipientDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recipientDetailLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  recipientDetailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  fieldGroup: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  required: {
    color: "#EF4444",
  },
  accountSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  selectorIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  selectorContent: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  accountMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  placeholderText: {
    flex: 1,
    fontSize: 14,
    color: "#94A3B8",
  },
  amountWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: "#25145F",
  },
  currencyDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: 12,
    color: "#0F172A",
  },
  balanceHintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  balanceHintLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  balanceHintValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  balanceError: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  fieldError: {
    color: "#EF4444",
    fontSize: 12,
  },
  fieldHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  preferencesSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  preferenceDescription: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  notificationValue: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  notificationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#25145F",
  },
  actionSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  submitButton: {
    backgroundColor: "#25145F",
    borderRadius: 50,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#25145F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  actionHint: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
  },
  errorBannerText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  accountSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "75%",
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 8,
  },
  sheetEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  selectedAccountItem: {
    backgroundColor: "#F8FAFC",
  },
  accountItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  accountItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountItemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  accountItemNumber: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  accountItemBalance: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  accountItemBalanceCaption: {
    fontWeight: "400",
    color: "#64748B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    alignItems: "center",
  },
  confirmIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  confirmEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  confirmTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  confirmDescription: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  paymentSummary: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  summaryAmountLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#25145F",
    textAlign: "center",
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    maxWidth: "60%",
    textAlign: "right",
  },
  confirmNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3E8FF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  confirmNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#25145F",
    fontWeight: "500",
    lineHeight: 15,
  },
  confirmPrimaryButton: {
    width: "100%",
    backgroundColor: "#25145F",
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  confirmPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  confirmCancelButton: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmCancelText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
  },
  errorModal: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  modalMessage: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  modalButton: {
    marginTop: 20,
    width: "100%",
    backgroundColor: "#25145F",
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
