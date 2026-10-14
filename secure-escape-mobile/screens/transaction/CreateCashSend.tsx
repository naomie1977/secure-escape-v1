import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { getAccounts } from "@/services/accountService";
import { createCashSend } from "@/services/transactionServices";
import { AccountResponse } from "@/types/account";
import { CashSendResponse } from "@/types/transaction";
import { colors, spacing, radii, sizing } from "@/utils/theme";
import VerifyPinModal from "@/components/VerifyPinModal";
import SuccessModal from "@/components/SuccessModal";

const MAX_CASH_SEND_AMOUNT = 4000;

const createCashSendReference = () => {
  const timestamp = new Date();
  const date = timestamp
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const time = timestamp
    .toTimeString()
    .slice(0, 8)
    .replace(/:/g, "");
  const suffix = Math.floor(1000 + Math.random() * 9000);

  return `CASH-${date}-${time}-${suffix}`;
};

const formatCurrency = (value: number) =>
  `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function CreateCashSend() {
  const router = useRouter();
  const { reference: routeReference } = useLocalSearchParams<{ reference?: string }>();

  const [verifyVisible, setVerifyVisible] = useState(false);
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [voucherPin, setVoucherPin] = useState("");
  const [description] = useState(() => routeReference || createCashSendReference());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [createdCashSend, setCreatedCashSend] =
    useState<CashSendResponse | null>(null);

  const [focusedField, setFocusedField] = useState<
    "amount" | "pin" | null
  >(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.status === "Active"
      ),
    [accounts]
  );

  const selectedAccount = activeAccounts.find(
    (account) => account.id === selectedAccountId
  );

  const maxAmountForSelectedAccount = Math.min(
    MAX_CASH_SEND_AMOUNT,
    selectedAccount?.availableBalance ?? MAX_CASH_SEND_AMOUNT
  );

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
      clearError();

      const data = await getAccounts();
      setAccounts(data);

      const firstActive = data.find(
        (account) => account.status === "Active"
      );

      if (firstActive) {
        setSelectedAccountId(firstActive.id);
      }
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (account: AccountResponse) => {
    setSelectedAccountId(account.id);

    const numericAmount = Number(amount);

    if (numericAmount > account.availableBalance) {
      setAmount("");
    }

    clearError();
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");

    if ((cleaned.match(/\./g) || []).length > 1) {
      return;
    }

    const [whole, decimal] = cleaned.split(".");

    const normalized =
      decimal === undefined
        ? whole
        : `${whole}.${decimal.slice(0, 2)}`;

    const numericAmount = Number(normalized);

    if (
      Number.isFinite(numericAmount) &&
      numericAmount > maxAmountForSelectedAccount
    ) {
      return;
    }

    setAmount(normalized);
    clearError();
  };

  const handlePinChange = (value: string) => {
    setVoucherPin(
      value.replace(/\D/g, "").slice(0, 6)
    );

    clearError();
  };

  const handleSubmit = () => {
    const trimmedAmount = amount.trim();
    const numericAmount = Number(trimmedAmount);

    if (!selectedAccountId) {
      showError("Please choose an account.");
      return;
    }

    if (!trimmedAmount) {
      showError("Please enter the cash send amount.");
      return;
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(trimmedAmount) ||
      !Number.isFinite(numericAmount)
    ) {
      showError(
        "Enter a valid amount with no more than two decimal places."
      );
      return;
    }

    if (numericAmount < 0.01) {
      showError(
        "Cash send amount must be at least R 0.01."
      );
      return;
    }

    if (numericAmount > MAX_CASH_SEND_AMOUNT) {
      showError(
        `Cash send amount cannot exceed R ${MAX_CASH_SEND_AMOUNT.toLocaleString()}.`
      );
      return;
    }

    if (
      selectedAccount &&
      numericAmount > selectedAccount.availableBalance
    ) {
      showError(
        "Insufficient funds. Please enter a lower amount."
      );
      return;
    }

    if (!voucherPin.trim()) {
      showError("Please enter a cash send PIN.");
      return;
    }

    if (voucherPin.length < 4 || voucherPin.length > 6) {
      showError(
        "Cash send PIN must be 4 to 6 digits."
      );
      return;
    }

    Keyboard.dismiss();
    setVerifyVisible(true);
  };

  const handleVerifiedSubmit = async () => {
    setVerifyVisible(false);

    try {
      setSaving(true);
      clearError();

      const cashSend = await createCashSend({
        bankAccountId: selectedAccountId,
        amount: Number(amount.trim()),
        voucherPin: voucherPin.trim(),
        description: description.trim(),
      });

      if (
        cashSend.status === "Failed" ||
        cashSend.status === "Blocked"
      ) {
        showError(
          "This cash send could not be processed. Please try a lower amount."
        );
        return;
      }

      setCreatedCashSend(cashSend);
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#25145F"
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
            Cash Send
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            SEND MONEY
          </Text>

          <Text style={styles.headerHeading}>
            Create Cash Send
          </Text>

          <Text style={styles.headerDescription}>
            Send money to someone using an instant cash voucher.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="cash-outline"
              size={17}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            Cash send limit: R 4,000.00
          </Text>
        </View>
      </View>

      {/* MAIN FORM */}
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
          {/* SOURCE ACCOUNT */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              From Account
            </Text>

            <Text style={styles.sectionDescription}>
              Choose the account you want to send money from.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator
                color="#25145F"
                size="small"
              />

              <Text style={styles.loadingText}>
                Loading accounts…
              </Text>
            </View>
          ) : activeAccounts.length === 0 ? (
            <View style={styles.emptyAccountState}>
              <Ionicons
                name="wallet-outline"
                size={25}
                color={colors.textSub}
              />

              <Text style={styles.emptyAccountTitle}>
                No active accounts
              </Text>

              <Text style={styles.emptyAccountDescription}>
                You need an active account to create a cash send.
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadAccounts}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>
                  Refresh accounts
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.accountsList}>
              {activeAccounts.map((account) => {
                const selected =
                  selectedAccountId === account.id;

                return (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountRow,
                      selected &&
                        styles.selectedAccountRow,
                    ]}
                    onPress={() =>
                      handleAccountSelect(account)
                    }
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: selected,
                    }}
                    accessibilityLabel={`${account.accountName}, available balance ${formatCurrency(account.availableBalance)}`}
                  >
                    <View
                      style={[
                        styles.accountIcon,
                        selected &&
                          styles.selectedAccountIcon,
                      ]}
                    >
                      <Ionicons
                        name="wallet-outline"
                        size={20}
                        color={selected ? "#25145F" : colors.textSub}
                      />
                    </View>

                    <View style={styles.accountInfo}>
                      <Text
                        style={styles.accountName}
                        numberOfLines={1}
                      >
                        {account.accountName}
                      </Text>

                      <Text
                        style={styles.accountNumber}
                        numberOfLines={1}
                      >
                        {account.accountNumber}
                      </Text>

                      <Text style={styles.accountBalance}>
                        {formatCurrency(
                          account.availableBalance
                        )}
                        <Text
                          style={styles.balanceCaption}
                        >
                          {" "}available
                        </Text>
                      </Text>
                    </View>

                    <Ionicons
                      name={
                        selected
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={23}
                      color={
                        selected
                          ? "#25145F"
                          : colors.textLight
                      }
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* CASH SEND DETAILS */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>
              Cash Send Details
            </Text>

            <Text style={styles.sectionDescription}>
              Enter the amount and create a voucher PIN.
            </Text>
          </View>

          {/* AMOUNT */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Amount
              <Text style={styles.required}> *</Text>
            </Text>

            <View
              style={[
                styles.amountInputContainer,
                focusedField === "amount" &&
                  styles.inputFocused,
              ]}
            >
              <Text style={styles.currencyPrefix}>
                R
              </Text>

              <View style={styles.prefixDivider} />

              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                onFocus={() =>
                  setFocusedField("amount")
                }
                onBlur={() =>
                  setFocusedField(null)
                }
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
                accessibilityLabel="Cash send amount in rand"
              />
            </View>

            <View style={styles.amountInfoRow}>
              <Text style={styles.fieldHint}>
                Maximum per cash send
              </Text>

              <Text style={styles.amountLimit}>
                {formatCurrency(
                  MAX_CASH_SEND_AMOUNT
                )}
              </Text>
            </View>

            {selectedAccount && (
              <View style={styles.amountInfoRow}>
                <Text style={styles.fieldHint}>
                  Available to send
                </Text>

                <Text style={styles.availableAmount}>
                  {formatCurrency(
                    Math.max(
                      0,
                      maxAmountForSelectedAccount
                    )
                  )}
                </Text>
              </View>
            )}
          </View>

          {/* VOUCHER PIN */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Cash Send PIN (4-6 digits)
              <Text style={styles.required}> *</Text>
            </Text>

            <View
              style={[
                styles.inputContainer,
                focusedField === "pin" &&
                  styles.inputFocused,
              ]}
            >
              <View style={styles.inputPrefix}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textSub}
                />
              </View>

              <TextInput
                style={styles.input}
                value={voucherPin}
                onChangeText={handlePinChange}
                onFocus={() =>
                  setFocusedField("pin")
                }
                onBlur={() =>
                  setFocusedField(null)
                }
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                placeholder="Enter 4 to 6 digit PIN"
                placeholderTextColor={colors.textLight}
                accessibilityLabel="Four to six digit cash send PIN"
              />
            </View>

            <Text style={styles.fieldHint}>
              Choose a secure PIN that the recipient will use to withdraw.
            </Text>
          </View>

          {/* REFERENCE */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                Reference
              </Text>

              <View style={styles.autoBadge}>
                <Text style={styles.autoBadgeText}>
                  REFERENCE
                </Text>
              </View>
            </View>

            <View style={styles.readOnlyField}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.textSub}
              />

              <Text
                style={styles.referenceText}
                numberOfLines={2}
                selectable
                accessibilityLabel="Cash send reference"
              >
                {description}
              </Text>

              <Ionicons
                name="lock-closed-outline"
                size={15}
                color={colors.textLight}
              />
            </View>

            <Text style={styles.fieldHint}>
              Unique transaction reference.
            </Text>
          </View>

          {/* GENERAL ERROR */}
          {!!error && (
            <TouchableOpacity
              style={styles.errorBanner}
              activeOpacity={0.8}
              onPress={() =>
                setShowErrorModal(true)
              }
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
          {!createdCashSend && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  saving && styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Create cash send"
                accessibilityState={{
                  disabled: saving,
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
                      Create Cash Send
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
                You'll be asked to verify your PIN before the cash send is created.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* EXISTING PIN VERIFICATION */}
      <VerifyPinModal
        visible={verifyVisible}
        onCancel={() =>
          setVerifyVisible(false)
        }
        onVerified={handleVerifiedSubmit}
        subtitle="Enter your PIN to send this cash send"
      />

      {/* EXISTING SUCCESS FLOW */}
      <SuccessModal
        visible={!!createdCashSend && createdCashSend.status !== "Pending"}
        title="Cash Send Created"
        message={`Your Cash Send of ${formatCurrency(
          Number(amount) || 0
        )} is ready. Share the voucher number with the recipient.`}
        details={[
          {
            label: "Voucher Number",
            value: createdCashSend?.voucherNumber,
          },
          {
            label: "Reference",
            value: createdCashSend?.bankReference || description,
          },
          {
            label: "Status",
            value: createdCashSend?.status,
          },
        ]}
        primaryLabel="Done"
        onPrimaryPress={() =>
          router.replace("/(tabs)")
        }
      />

      {/* PENDING SECURITY MODAL */}
      <Modal
        transparent
        animationType="fade"
        statusBarTranslucent
        visible={createdCashSend?.status === "Pending"}
        onRequestClose={() => undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModal}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={29} color="#A86E00" />
            </View>
            <Text style={styles.modalTitle}>Security Verification</Text>
            <Text style={styles.modalMessage}>
              For your security, this cash send requires an additional banking
              verification. The request has been placed on hold while the
              verification is completed. No funds have been released.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              Cash Send Failed
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  headerDescription: {
    fontSize: 13,
    color: "#E4E1FF",
    marginTop: spacing.sm,
    lineHeight: 19,
    maxWidth: 300,
  },
  headerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: spacing.xxl,
  },
  headerFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  headerFooterIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerFooterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E4E1FF",
  },
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
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
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
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSub,
  },
  accountsList: {
    gap: spacing.sm,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  selectedAccountRow: {
    borderColor: "#25145F",
    backgroundColor: "#F4F0FF",
  },
  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  selectedAccountIcon: {
    backgroundColor: colors.white,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  accountNumber: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  accountBalance: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginTop: spacing.xs,
    fontVariant: ["tabular-nums"],
  },
  balanceCaption: {
    fontSize: 11,
    fontWeight: "400",
    color: colors.textSub,
  },
  emptyAccountState: {
    alignItems: "center",
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  emptyAccountTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },
  emptyAccountDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSub,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "#25145F",
    borderRadius: radii.md,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#25145F",
  },
  detailsSection: {
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.greyLine,
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.dangerStrong,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: "#25145F",
    borderWidth: 1.5,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
    marginRight: spacing.md,
  },
  prefixDivider: {
    height: 24,
    width: 1,
    backgroundColor: colors.greyLine,
    marginRight: spacing.md,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    paddingVertical: 0,
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
  amountInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  amountLimit: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSub,
    fontVariant: ["tabular-nums"],
  },
  availableAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  inputPrefix: {
    marginRight: spacing.md,
    paddingRight: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.greyLine,
    height: 22,
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: "500",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
  autoBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: colors.textSub,
  },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.md,
  },
  referenceText: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSub,
    fontVariant: ["tabular-nums"],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
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
  actionSection: {
    marginTop: spacing.xl,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    backgroundColor: "#25145F",
    borderRadius: 14,
    gap: spacing.sm,
    shadowColor: "#25145F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: "#25145F",
    borderRadius: radii.md,
    marginTop: spacing.xxl,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
