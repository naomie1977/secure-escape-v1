import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import VerifyPinModal from "@/components/VerifyPinModal";
import { getAccounts } from "@/services/accountService";
import { createTransfer } from "@/services/transactionServices";
import { getSessionMode } from "@/services/tokenStore";
import { AccountResponse } from "@/types/account";
import { TransactionResponse } from "@/types/transaction";

const ACCOUNT_TYPES = ["Cheque", "Savings", "Transmission"];

const validateReference = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) return "Reference is required.";
  if (trimmed.length < 2) return "Reference must be at least 2 characters.";
  if (trimmed.length > 50) return "Reference may not exceed 50 characters.";

  if (!/^[A-Za-z0-9\s\-_,.&/']+$/.test(trimmed)) {
    return "Reference contains unsupported characters.";
  }

  return "";
};

export default function OnceOffTransfer() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [recipientAccountType, setRecipientAccountType] = useState("");
  const [recipientBranchCode, setRecipientBranchCode] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [accountTypeModalVisible, setAccountTypeModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [createdTransaction, setCreatedTransaction] =
    useState<TransactionResponse | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === "Active"),
    [accounts],
  );

  const selectedAccount = activeAccounts.find(
    (account) => account.id === selectedAccountId,
  );

  const numericAmount = Number(amount) || 0;

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);

      const data = await getAccounts();
      setAccounts(data);

      const firstActive = data.find((account) => account.status === "Active");

      if (firstActive) {
        setSelectedAccountId(firstActive.id);
      }
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Unable to load your accounts.",
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): string | null => {
    if (!selectedAccountId) {
      return "Please choose the account you want to pay from.";
    }

    if (!recipientName.trim()) {
      return "Please enter the recipient's name.";
    }

    if (!recipientBank.trim()) {
      return "Please enter the recipient's bank.";
    }

    if (!recipientAccountNumber.trim()) {
      return "Please enter the recipient's account number.";
    }

    if (!/^\d{6,20}$/.test(recipientAccountNumber.trim())) {
      return "Please enter a valid account number.";
    }

    if (!recipientAccountType) {
      return "Please choose the recipient's account type.";
    }

    if (!recipientBranchCode.trim()) {
      return "Please enter the branch code.";
    }

    if (!/^\d{6}$/.test(recipientBranchCode.trim())) {
      return "Branch code must contain 6 digits.";
    }

    if (!amount.trim() || !Number.isFinite(Number(amount)) || numericAmount <= 0) {
      return "Please enter a valid payment amount.";
    }

    if (
      selectedAccount &&
      numericAmount > selectedAccount.availableBalance
    ) {
      return `Amount exceeds the available balance of R ${selectedAccount.availableBalance.toLocaleString()}.`;
    }

    const referenceError = validateReference(description);

    if (referenceError) {
      return referenceError;
    }

    return null;
  };

  const handlePayPress = async () => {
    const validationError = validateForm();

    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      const sessionMode = await getSessionMode();

      if (sessionMode === "Duress") {
        router.push({
          pathname: "/transactions/selfie-verification",
          params: {
            transferType: "onceOff",
            recipientName: recipientName.trim(),
            recipientBank: recipientBank.trim(),
            recipientAccountNumber: recipientAccountNumber.trim(),
            recipientAccountType,
            recipientBranchCode: recipientBranchCode.trim(),
            reference: description.trim(),
            amount: numericAmount.toString(),
            accountId: selectedAccountId,
            accountName: selectedAccount?.accountName ?? "",
          },
        });

        return;
      }

      setConfirmModalVisible(true);
    } catch {
      showError("Unable to verify your session. Please try again.");
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

      const transaction = await createTransfer({
        bankAccountId: selectedAccountId,
        beneficiaryId: null,
        recipientName: recipientName.trim(),
        recipientBank: recipientBank.trim(),
        recipientAccountNumber: recipientAccountNumber.trim(),
        recipientAccountType,
        recipientBranchCode: recipientBranchCode.trim(),
        amount: numericAmount,
        description: description.trim(),
      });

      if (
        transaction.status === "Failed" ||
        transaction.status === "Blocked"
      ) {
        showError(
          transaction.statusReason ||
            "This transfer could not be processed.",
        );
        return;
      }

      setCreatedTransaction(transaction);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Unable to complete the transfer.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderAccountItem = ({ item }: { item: AccountResponse }) => (
    <TouchableOpacity
      style={styles.accountItem}
      onPress={() => {
        setSelectedAccountId(item.id);
        setAccountModalVisible(false);
      }}
    >
      <View>
        <Text style={styles.accountItemName}>{item.accountName}</Text>
        <Text style={styles.accountItemBalance}>
          R {item.availableBalance.toLocaleString()} • {item.accountNumber}
        </Text>
      </View>

      {selectedAccountId === item.id && (
        <Ionicons
          name="checkmark-circle"
          size={22}
          color="#25145F"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Deep Purple Header */}
      <View style={styles.topPurpleCard}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerEyebrow}>BANK TRANSFER</Text>
            <Text style={styles.headerTitle}>Once-off Payment</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipient Details Card */}
          <View style={styles.formCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionBadge}>
                <Ionicons name="person-outline" size={16} color="#25145F" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Recipient Details</Text>
                <Text style={styles.sectionHint}>
                  Enter the banking details for this once-off payment
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Recipient Name</Text>
            <TextInput
              style={styles.input}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="e.g. John Doe or Jane Trading"
              placeholderTextColor="#94A3B8"
              maxLength={150}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Bank</Text>
            <TextInput
              style={styles.input}
              value={recipientBank}
              onChangeText={setRecipientBank}
              placeholder="e.g. Standard Bank, FNB, Nedbank"
              placeholderTextColor="#94A3B8"
              maxLength={100}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={recipientAccountNumber}
              onChangeText={(text) =>
                setRecipientAccountNumber(text.replace(/\D/g, ""))
              }
              placeholder="6 to 20 digit account number"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={20}
            />

            <Text style={styles.label}>Account Type</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setAccountTypeModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text
                style={
                  recipientAccountType
                    ? styles.selectorText
                    : styles.placeholderText
                }
              >
                {recipientAccountType || "Select account type"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.label}>Branch Code</Text>
            <TextInput
              style={styles.input}
              value={recipientBranchCode}
              onChangeText={(text) =>
                setRecipientBranchCode(text.replace(/\D/g, ""))
              }
              placeholder="6-digit branch code (e.g. 051001)"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          {/* Payment Details Card */}
          <View style={styles.formCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionBadge}>
                <Ionicons name="wallet-outline" size={16} color="#25145F" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Payment Details</Text>
                <Text style={styles.sectionHint}>
                  Choose source account and amount
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Pay From</Text>
            <TouchableOpacity
              style={styles.accountSelector}
              onPress={() => setAccountModalVisible(true)}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#25145F" />
              ) : selectedAccount ? (
                <View style={styles.accountSelectorContent}>
                  <View style={styles.accountSelectorLeft}>
                    <View style={styles.accountIconBox}>
                      <Ionicons name="card-outline" size={20} color="#25145F" />
                    </View>
                    <View>
                      <Text style={styles.selectorText}>
                        {selectedAccount.accountName}
                      </Text>
                      <Text style={styles.accountMeta}>
                        Available: R {selectedAccount.availableBalance.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select account</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountWrapper}>
              <Text style={styles.currencySymbol}>R</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => {
                  let cleaned = text.replace(/[^0-9.]/g, "");
                  if ((cleaned.match(/\./g) || []).length > 1) {
                    return;
                  }
                  setAmount(cleaned);
                }}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
            </View>

            {!!selectedAccount && !!amount && (
              <View style={styles.balanceInfoRow}>
                <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                <Text style={styles.balanceHint}>
                  Available: R {selectedAccount.availableBalance.toLocaleString()}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Recipient Reference</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Invoice 1042 / Rent"
              placeholderTextColor="#94A3B8"
              maxLength={50}
            />
          </View>

          {createdTransaction ? (
            <View style={styles.successCard}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Transfer Submitted</Text>
              <Text style={styles.successStatus}>Status: {createdTransaction.status}</Text>
              <Text style={styles.successRef}>
                Reference: {createdTransaction.bankReference || description}
              </Text>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => router.replace("/(tabs)")}
                activeOpacity={0.8}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                saving && styles.disabledButton,
              ]}
              onPress={handlePayPress}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.submitButtonInner}>
                  <Text style={styles.submitText}>Pay Now</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Picker Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={accountModalVisible}
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAccountModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Account</Text>
              <TouchableOpacity
                onPress={() => setAccountModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeAccounts}
              keyExtractor={(item) => item.id}
              renderItem={renderAccountItem}
            />
          </View>
        </View>
      </Modal>

      {/* Account Type Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={accountTypeModalVisible}
        onRequestClose={() => setAccountTypeModalVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.smallModalContent}>
            <Text style={styles.modalTitle}>Account Type</Text>
            <Text style={styles.modalSubtitle}>Select beneficiary's account category</Text>

            {ACCOUNT_TYPES.map((type) => {
              const isSelected = recipientAccountType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                  onPress={() => {
                    setRecipientAccountType(type);
                    setAccountTypeModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      isSelected && styles.typeOptionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#25145F"
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setAccountTypeModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Payment Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={36}
                color="#25145F"
              />
            </View>

            <Text style={styles.confirmTitle}>Confirm Payment</Text>

            <Text style={styles.confirmMessage}>
              You are about to transfer{" "}
              <Text style={styles.boldText}>
                R {numericAmount.toLocaleString()}
              </Text>{" "}
              to{" "}
              <Text style={styles.boldText}>
                {recipientName.trim()}
              </Text>
              .
            </Text>

            <View style={styles.confirmSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bank</Text>
                <Text style={styles.summaryValue}>{recipientBank.trim()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Account</Text>
                <Text style={styles.summaryValue}>{recipientAccountNumber.trim()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Reference</Text>
                <Text style={styles.summaryValue}>{description.trim()}</Text>
              </View>
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSubmitButton}
                onPress={confirmPayment}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmSubmitText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <VerifyPinModal
        visible={verifyVisible}
        onCancel={() => setVerifyVisible(false)}
        onVerified={handleVerifiedSubmit}
        subtitle="Enter your PIN to send this transfer"
      />

      {/* Error Modal */}
      <Modal
        transparent
        visible={showErrorModal && !!error}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.errorModal}>
            <View style={styles.errorIconCircle}>
              <Ionicons
                name="alert-circle"
                size={32}
                color="#EF4444"
              />
            </View>

            <Text style={styles.errorModalTitle}>Unable to Continue</Text>
            <Text style={styles.errorModalMessage}>{error}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowErrorModal(false)}
              activeOpacity={0.8}
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
    backgroundColor: "#F8FAFC",
  },
  topPurpleCard: {
    backgroundColor: "#25145F",
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F4F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  sectionHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  selectorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  placeholderText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  accountSelector: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  accountSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F4F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  accountMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  amountWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: "#25145F",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: 12,
    color: "#0F172A",
  },
  balanceInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  balanceHint: {
    fontSize: 12,
    color: "#64748B",
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: "#25145F",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#25145F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  successBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  successStatus: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 4,
  },
  successRef: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
  },
  doneButton: {
    marginTop: 20,
    width: "100%",
    backgroundColor: "#25145F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 14,
  },
  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  accountItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  accountItemBalance: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  smallModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    width: "90%",
    maxWidth: 380,
  },
  typeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
  },
  typeOptionSelected: {
    backgroundColor: "#F4F0FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  typeOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  typeOptionTextSelected: {
    color: "#25145F",
  },
  closeModalButton: {
    marginTop: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 14,
  },
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "92%",
    maxWidth: 400,
    alignItems: "center",
  },
  confirmIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F4F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  confirmSummaryBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontWeight: "600",
    color: "#475569",
    fontSize: 14,
  },
  confirmSubmitButton: {
    flex: 1.3,
    backgroundColor: "#25145F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmSubmitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  errorModal: {
    width: "90%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  errorModalMessage: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  modalButton: {
    marginTop: 18,
    width: "100%",
    backgroundColor: "#25145F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
