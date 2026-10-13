import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors } from "@/utils/theme";
import { TransactionResponse } from "@/types/transaction";

// ─────────────────────────────────────────────
// TRANSACTION DISPLAY METADATA
// ─────────────────────────────────────────────

type TypeMeta = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  bg: string;
  color: string;
};

type StatusMeta = {
  label: string;
  bg: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TYPE_META: Record<string, TypeMeta> = {
  Transfer: {
    icon: "swap-horizontal-outline",
    label: "Bank transfer",
    bg: colors.primarySubtle,
    color: colors.primaryDark,
  },
  CashVoucher: {
    icon: "cash-outline",
    label: "Cash send",
    bg: "#EAF7F0",
    color: "#168452",
  },
};

const STATUS_META: Record<string, StatusMeta> = {
  Approved: {
    label: "Approved",
    bg: "#EAF7F0",
    color: "#168452",
    icon: "checkmark-circle-outline",
  },
  DecoyApproved: {
    // Must look identical to an ordinary approval.
    label: "Approved",
    bg: "#EAF7F0",
    color: "#168452",
    icon: "checkmark-circle-outline",
  },
  Failed: {
    label: "Failed",
    bg: "#FDECEC",
    color: "#B42332",
    icon: "alert-circle-outline",
  },
  Pending: {
    label: "Pending",
    bg: "#FFF5E5",
    color: "#9A6700",
    icon: "time-outline",
  },
  Blocked: {
    label: "Blocked",
    bg: "#FDECEC",
    color: "#B42332",
    icon: "alert-circle-outline",
  },
  Delayed: {
    label: "Delayed",
    bg: "#FFF5E5",
    color: "#9A6700",
    icon: "time-outline",
  },
};

const DEFAULT_TYPE: TypeMeta = {
  icon: "receipt-outline",
  label: "Transaction",
  bg: colors.surfaceMuted,
  color: colors.primaryDark,
};

const DEFAULT_STATUS: StatusMeta = {
  label: "Unknown",
  bg: colors.surfaceMuted,
  color: colors.textSub,
  icon: "help-circle-outline",
};

// ─────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────

const formatAmount = (amount: number, currency: string) =>
  `${currency === "ZAR" ? "R" : currency} ${amount.toLocaleString(
    "en-ZA",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// ─────────────────────────────────────────────
// REUSABLE DETAIL ROW
// ─────────────────────────────────────────────

function DetailRow({
  label,
  value,
  last = false,
  selectable = false,
}: {
  label: string;
  value?: string | null;
  last?: boolean;
  selectable?: boolean;
}) {
  if (!value) return null;

  return (
    <View
      style={[
        styles.detailRow,
        last && styles.lastDetailRow,
      ]}
    >
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        style={styles.detailValue}
        selectable={selectable}
      >
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────

export default function TransactionDetail() {
  const router = useRouter();

  const { transaction } = useLocalSearchParams<{
    transaction?: string;
  }>();

  // Prevent malformed or missing route data from crashing the screen.
  const item = useMemo<TransactionResponse | null>(() => {
    if (!transaction) return null;

    try {
      const parsed: unknown = JSON.parse(transaction);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return null;
      }

      const data = parsed as Partial<TransactionResponse>;

      if (
        typeof data.id !== "string" ||
        typeof data.amount !== "number" ||
        !Number.isFinite(data.amount) ||
        typeof data.currency !== "string" ||
        typeof data.transactionType !== "string" ||
        typeof data.status !== "string" ||
        typeof data.createdAt !== "string"
      ) {
        return null;
      }

      return data as TransactionResponse;
    } catch {
      return null;
    }
  }, [transaction]);

  const typeMeta = item
    ? TYPE_META[item.transactionType] ?? DEFAULT_TYPE
    : DEFAULT_TYPE;

  const statusMeta = item
    ? STATUS_META[item.status] ?? DEFAULT_STATUS
    : DEFAULT_STATUS;

  // Decoy approvals must not disclose their internal status.
  const statusReason =
    item?.status === "DecoyApproved"
      ? undefined
      : item?.statusReason;

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
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.white}
            />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>
            Transaction details
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            ACCOUNT ACTIVITY
          </Text>

          <Text style={styles.headerHeading}>
            Transaction details
          </Text>

          <Text style={styles.headerDescription}>
            Review the details of your transaction.
          </Text>
        </View>
      </View>

      {!item ? (
        // MISSING OR INVALID TRANSACTION
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="receipt-outline"
              size={29}
              color={colors.primaryDark}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Transaction not found
          </Text>

          <Text style={styles.emptyDescription}>
            We couldn't display this transaction.
            Return to your history and select it again.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* TRANSACTION SUMMARY */}
          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: typeMeta.bg },
              ]}
            >
              <Ionicons
                name={typeMeta.icon}
                size={27}
                color={typeMeta.color}
              />
            </View>

            <Text style={styles.summaryEyebrow}>
              {typeMeta.label.toUpperCase()}
            </Text>

            <Text
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {formatAmount(item.amount, item.currency)}
            </Text>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusMeta.bg },
              ]}
            >
              <Ionicons
                name={statusMeta.icon}
                size={15}
                color={statusMeta.color}
              />

              <Text
                style={[
                  styles.statusText,
                  { color: statusMeta.color },
                ]}
              >
                {statusMeta.label}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryFooter}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={colors.textSub}
              />

              <Text style={styles.summaryDate}>
                {formatDateTime(item.createdAt)}
              </Text>
            </View>
          </View>

          {/* PAYMENT DETAILS */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Payment information
            </Text>

            <Text style={styles.sectionDescription}>
              Details associated with this transaction.
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <DetailRow
              label="Transaction type"
              value={typeMeta.label}
            />

            <DetailRow
              label="Beneficiary"
              value={item.beneficiaryName}
            />

            <DetailRow
              label="Bank reference"
              value={item.bankReference}
              selectable
            />

            <DetailRow
              label="Description"
              value={item.description}
            />

            <DetailRow
              label="Date and time"
              value={formatDateTime(item.createdAt)}
              last={!item.voucherNumber && !statusReason}
            />
          </View>

          {/* CASH VOUCHER DETAILS */}
          {!!item.voucherNumber && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Cash voucher
                </Text>

                <Text style={styles.sectionDescription}>
                  Your cash send voucher information.
                </Text>
              </View>

              <View style={styles.voucherCard}>
                <View style={styles.voucherHeader}>
                  <View style={styles.voucherIcon}>
                    <Ionicons
                      name="ticket-outline"
                      size={20}
                      color={colors.primaryDark}
                    />
                  </View>

                  <View style={styles.voucherHeaderText}>
                    <Text style={styles.voucherEyebrow}>
                      VOUCHER NUMBER
                    </Text>

                    <Text
                      style={styles.voucherNumber}
                      selectable
                    >
                      {item.voucherNumber}
                    </Text>
                  </View>
                </View>

                {!!item.voucherExpiresAt && (
                  <DetailRow
                    label="Expires"
                    value={formatDateTime(
                      item.voucherExpiresAt
                    )}
                  />
                )}

                <DetailRow
                  label="Redeemed"
                  value={
                    item.voucherRedeemed ? "Yes" : "No"
                  }
                  last
                />
              </View>

              <View style={styles.voucherNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.primaryDark}
                />

                <Text style={styles.voucherNoteText}>
                  Share voucher details only with the
                  intended recipient.
                </Text>
              </View>
            </>
          )}

          {/* STATUS INFORMATION */}
          {!!statusReason && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Status information
                </Text>
              </View>

              <View style={styles.statusInfoCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={statusMeta.color}
                />

                <Text style={styles.statusInfoText}>
                  {statusReason}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
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
    color: colors.white,
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
    color: colors.white,
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  headerDescription: {
    fontSize: 13,
    color: "#E4E1FF",
    marginTop: 8,
    lineHeight: 19,
  },

  // MAIN CONTENT
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 44,
  },

  // SUMMARY
  summaryCard: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 18,
    marginBottom: 30,
  },

  summaryIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  summaryEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.textSub,
    marginBottom: 9,
  },

  amount: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 13,
    gap: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  summaryDivider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginTop: 23,
    marginBottom: 16,
  },

  summaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  summaryDate: {
    fontSize: 12,
    color: colors.textSub,
  },

  // SECTION HEADINGS
  sectionHeader: {
    marginBottom: 15,
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

  // DETAIL ROWS
  detailsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 16,
    marginBottom: 30,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 14,
  },

  lastDetailRow: {
    borderBottomWidth: 0,
  },

  detailLabel: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
    flexShrink: 0,
  },

  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    lineHeight: 19,
    textAlign: "right",
  },

  // VOUCHER
  voucherCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  voucherHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },

  voucherIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },

  voucherHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  voucherEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.6,
    marginBottom: 5,
  },

  voucherNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },

  voucherNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 30,
    paddingHorizontal: 3,
  },

  voucherNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 18,
  },

  // STATUS INFORMATION
  statusInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 15,
    gap: 10,
  },

  statusInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 19,
  },

  // MISSING TRANSACTION
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
  },

  emptyDescription: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },

  emptyButton: {
    backgroundColor: colors.primary,
    minHeight: 48,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 23,
  },

  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
