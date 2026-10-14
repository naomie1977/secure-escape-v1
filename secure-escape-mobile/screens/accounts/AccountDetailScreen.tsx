
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  SectionList,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, sizing } from "@/utils/theme";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { getAccountById } from "@/services/accountService";
import { getTransactions } from "@/services/transactionServices";
import { AccountResponse } from "@/types/account";
import { TransactionResponse } from "@/types/transaction";

const STATUS_META: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  Approved: { label: "Approved", bg: "#E6F7EE", color: "#1FA971" },
  DecoyApproved: { label: "Approved", bg: "#E6F7EE", color: "#1FA971" },
  Failed: { label: "Failed", bg: "#FDECEC", color: "#E5484D" },
  Pending: { label: "Pending", bg: "#FFF6E5", color: "#B98900" },
  Blocked: { label: "Blocked", bg: "#FDECEC", color: "#E5484D" },
  Delayed: { label: "Delayed", bg: "#FFF6E5", color: "#B98900" },
};

export default function AccountDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const [accountData, allTransactions] = await Promise.all([
        getAccountById(id),
        getTransactions(),
      ]);

      setAccount(accountData);
      setTransactions(allTransactions.filter((t) => t.bankAccountId === id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id]),
  );

  const filteredTransactions = transactions
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      return [
        item.beneficiaryName,
        item.bankReference,
        item.description,
        item.amount?.toString(),
      ]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(query));
    });

  const groupByMonth = (items: TransactionResponse[]) => {
    const grouped: { [key: string]: TransactionResponse[] } = {};

    items.forEach((item) => {
      const monthKey = new Date(item.createdAt).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
      });

      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(item);
    });

    return Object.entries(grouped).map(([month, data]) => ({
      title: month,
      data,
    }));
  };

  const sections = groupByMonth(filteredTransactions);

  const formatAmount = (amount: number, currency: string) =>
    `${currency === "ZAR" ? "R" : currency} ${amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    return date.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderItem = ({ item }: { item: TransactionResponse }) => {
    const statusMeta = STATUS_META[item.status] ?? {
      label: item.status,
      bg: colors.surfaceMuted,
      color: colors.textSub,
    };

    return (
      <TouchableOpacity
        style={styles.transactionRow}
        activeOpacity={0.65}
        accessibilityRole="button"
        accessibilityLabel={`View transaction for ${item.beneficiaryName || item.description}, ${formatAmount(item.amount, item.currency)}, ${statusMeta.label}`}
        onPress={() =>
          router.push({
            pathname: "/transactions/transaction-detail",
            params: { transaction: JSON.stringify(item) },
          })
        }
      >
        <View style={styles.transactionIcon}>
          <Ionicons
            name="swap-horizontal-outline"
            size={19}
            color={colors.primaryDark}
          />
        </View>

        <View style={styles.transactionLeft}>
          <Text style={styles.merchantName} numberOfLines={1}>
            {item.beneficiaryName || item.description}
          </Text>

          <Text style={styles.transactionSubtitle} numberOfLines={1}>
            {item.transactionType} · {formatTime(item.createdAt)}
          </Text>
        </View>

        <View style={styles.transactionRight}>
          <Text
            style={styles.amount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {formatAmount(item.amount, item.currency)}
          </Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusMeta.bg },
            ]}
          >
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={15}
          color={colors.textLight}
          style={styles.rowChevron}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
      />

      {/* ACCOUNT HEADER */}
      <View style={styles.header}>
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.appBarBack}
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

          <Text style={styles.appBarTitle} numberOfLines={1}>
            Account details
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        {/* BALANCE SUMMARY */}
        <View style={styles.balanceSection}>
          <Text style={styles.accountEyebrow} numberOfLines={1}>
            {account?.accountName ?? "YOUR ACCOUNT"}
          </Text>

          <Text style={styles.balanceLabel}>
            Available balance
          </Text>

          <Text
            style={styles.balanceAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {account
              ? formatAmount(
                  account.availableBalance,
                  account.currency,
                )
              : "—"}
          </Text>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceMetaRow}>
            <View style={styles.currentBalance}>
              <Text style={styles.currentBalanceLabel}>
                Current balance
              </Text>

              <Text
                style={styles.currentBalanceValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {account
                  ? formatAmount(
                      account.currentBalance,
                      account.currency,
                    )
                  : "—"}
              </Text>
            </View>

            {account && (
              <View style={styles.statusCluster}>
                <View style={styles.accountStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          account.status === "Active"
                            ? "#8DE9C3"
                            : "#FFC4C4",
                      },
                    ]}
                  />

                  <Text style={styles.accountStatusText}>
                    {account.status}
                  </Text>
                </View>

                <Text
                  style={styles.accountNumber}
                  numberOfLines={1}
                >
                  {account.accountNumber}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* TRANSACTION HEADER */}
      <View style={styles.contentHeader}>
        <View style={styles.historyHeadingRow}>
          <Text style={styles.historyTitle}>
            Transactions
          </Text>

          {!loading && !error && (
            <Text style={styles.transactionCount}>
              {filteredTransactions.length}
            </Text>
          )}
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={19}
            color={colors.textSub}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions"
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            maxLength={25}
            returnKeyType="search"
            accessibilityLabel="Search transactions"
          />

          {!!searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              }}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={colors.textSub}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LOADING STATE */}
      {loading && (
        <View style={styles.stateWrap}>
          <ActivityIndicator
            color={colors.primary}
            size="small"
          />

          <Text style={styles.stateCaption}>
            Loading transactions…
          </Text>
        </View>
      )}

      {/* ERROR STATE */}
      {!!error && !loading && (
        <View style={styles.stateWrap}>
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={colors.textSub}
          />

          <Text style={styles.emptyText}>
            {error}
          </Text>
        </View>
      )}

      {/* TRANSACTION LIST */}
      <SectionList
        style={styles.list}
        sections={loading || error ? [] : sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionHeader}>
              {title}
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.stateWrap}>
              <Ionicons
                name="receipt-outline"
                size={28}
                color={colors.textLight}
              />

              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? "No transactions match your search"
                  : "No transactions yet"}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // HEADER

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

  appBarBack: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
  },

  appBarTitle: {
    flex: 1,
    color: colors.white,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },

  appBarSpacer: {
    width: sizing.touchTarget,
  },

  // BALANCE

  balanceSection: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  accountEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: "#E4E1FF",
    textTransform: "uppercase",
    marginBottom: spacing.xxl,
  },

  balanceLabel: {
    fontSize: 13,
    color: "#E4E1FF",
    marginBottom: spacing.xs,
  },

  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },

  balanceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },

  balanceMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.md,
  },

  currentBalance: {
    flex: 1,
    minWidth: 0,
  },

  currentBalanceLabel: {
    color: "#E4E1FF",
    fontSize: 12,
    marginBottom: spacing.xs,
  },

  currentBalanceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },

  statusCluster: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    gap: spacing.xs,
  },

  accountStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  accountStatusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },

  accountNumber: {
    color: "#E4E1FF",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },

  // TRANSACTION HEADER

  contentHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
  },

  historyHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  historyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  transactionCount: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSub,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },

  // SEARCH

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: colors.navy,
    fontSize: 14,
  },

  // TRANSACTION LIST

  list: {
    flex: 1,
  },

  listContent: {
    paddingBottom: spacing.xxxl,
  },

  sectionHeaderWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.white,
  },

  transactionIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },

  transactionLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },

  merchantName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  transactionSubtitle: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: spacing.xs,
  },

  transactionRight: {
    alignItems: "flex-end",
    flexShrink: 0,
    maxWidth: "41%",
  },

  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },

  statusBadge: {
    marginTop: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  rowChevron: {
    marginLeft: spacing.xs,
  },

  // LOADING AND EMPTY STATES

  stateWrap: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    alignItems: "center",
    gap: spacing.md,
  },

  stateCaption: {
    fontSize: 13,
    color: colors.textSub,
  },

  emptyText: {
    textAlign: "center",
    color: colors.textSub,
    fontSize: 14,
    lineHeight: 20,
  },
});
