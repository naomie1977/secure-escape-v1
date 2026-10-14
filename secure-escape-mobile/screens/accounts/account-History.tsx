
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SectionList,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, sizing } from "@/utils/theme";
import { useRouter, useLocalSearchParams } from "expo-router";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Transaction = {
  id: string;
  desc: string;
  category: string;
  amount: number;
  status: "Pending" | "Completed";
  date: Date;
};

type TransactionFilter = "All" | "Money In" | "Money Out";

const FILTERS: TransactionFilter[] = [
  "All",
  "Money In",
  "Money Out",
];

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const getSeed = (accountId: string) => {
  const date = new Date();

  const day =
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate();

  let hash = 0;

  for (let i = 0; i < accountId.length; i++) {
    hash = (hash << 5) - hash + accountId.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash + day);
};

const generateMockTransactions = (
  accountId: string,
): Transaction[] => {
  const seed = getSeed(accountId);

  const descriptions = [
    "SMS Notification Fee",
    "Uber",
    "Transfer",
    "Prepaid Mobile Purchase Fee",
    "Telkom Mobile",
    "Transfer",
    "Salary Deposit",
    "Online Shopping",
    "Restaurant",
    "Interest Earned",
    "ATM Withdrawal",
    "Groceries",
    "Petrol",
    "Insurance Premium",
    "Loan Repayment",
    "Dividend",
  ];

  const categories = [
    "Fees",
    "Other Transport",
    "Transfer",
    "Fees",
    "Cellphone",
    "Other Transport",
    "Income",
    "Shopping",
    "Food",
    "Income",
    "Cash",
    "Groceries",
    "Transport",
    "Insurance",
    "Loan",
    "Investment",
  ];

  const count =
    15 + Math.floor(seededRandom(seed + 1234) * 10);

  const transactions: Transaction[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const isCredit = seededRandom(seed + i * 7) > 0.7;

    const amount = isCredit
      ? Math.floor(
          seededRandom(seed + i * 13) * 5000 * 100,
        ) / 100
      : -Math.floor(
          seededRandom(seed + i * 17) * 500 * 100,
        ) / 100;

    if (Math.abs(amount) < 0.5) continue;

    const descIdx = Math.floor(
      seededRandom(seed + i * 23) * descriptions.length,
    );

    const catIdx = Math.floor(
      seededRandom(seed + i * 29) * categories.length,
    );

    const daysAgo = Math.floor(
      seededRandom(seed + i * 37) * 30,
    );

    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    transactions.push({
      id: `${accountId}-${i}`,
      desc: descriptions[descIdx],
      category: categories[catIdx],
      amount: parseFloat(amount.toFixed(2)),
      status:
        seededRandom(seed + i * 43) > 0.9
          ? "Pending"
          : "Completed",
      date,
    });
  }

  return transactions.sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
};

// ─────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────

const formatAmount = (amount: number) => {
  const value = Math.abs(amount).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `R ${value}`;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const groupByMonth = (transactions: Transaction[]) => {
  const groups: {
    [key: string]: Transaction[];
  } = {};

  transactions.forEach((transaction) => {
    const month = transaction.date.toLocaleDateString(
      "en-ZA",
      {
        month: "long",
        year: "numeric",
      },
    );

    if (!groups[month]) {
      groups[month] = [];
    }

    groups[month].push(transaction);
  });

  return Object.entries(groups).map(([title, data]) => ({
    title,
    data,
  }));
};

// ─────────────────────────────────────────────
// ACCOUNT DETAIL SCREEN
// ─────────────────────────────────────────────

export default function AccountDetailScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    accountId: string;
    accountName: string;
    balance: string;
  }>();

  const accountId = params.accountId || "mock-1";
  const accountName = params.accountName || "Main Account";

  const parsedBalance = Number(
    params.balance ?? "28840",
  );

  const balance = Number.isFinite(parsedBalance)
    ? parsedBalance
    : 28840;

  const [filter, setFilter] =
    useState<TransactionFilter>("All");

  const [searchQuery, setSearchQuery] = useState("");

  // Preserve the existing demo transaction generation.
  const transactions = useMemo(
    () => generateMockTransactions(accountId),
    [accountId],
  );

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesFilter =
        filter === "All" ||
        (filter === "Money In" &&
          transaction.amount > 0) ||
        (filter === "Money Out" &&
          transaction.amount < 0);

      const matchesSearch =
        !query ||
        transaction.desc.toLowerCase().includes(query) ||
        transaction.category.toLowerCase().includes(query) ||
        transaction.amount.toString().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, searchQuery]);

  const sections = useMemo(
    () => groupByMonth(filteredTransactions),
    [filteredTransactions],
  );

  // Existing demo balance calculation.
  const availableBalance = balance - 0.5;

  // ───────────────────────────────────────────
  // TRANSACTION ROW
  // ───────────────────────────────────────────

  const renderTransaction = ({
    item,
  }: {
    item: Transaction;
  }) => {
    const isCredit = item.amount > 0;
    const isPending = item.status === "Pending";

    return (
      <View style={styles.transactionRow}>
        <View style={styles.transactionIcon}>
          <Ionicons
            name={
              isCredit
                ? "arrow-down"
                : "arrow-up"
            }
            size={19}
            color={
              isCredit
                ? "#16875D"
                : colors.primaryDark
            }
          />
        </View>

        <View style={styles.transactionInfo}>
          <Text
            style={styles.transactionName}
            numberOfLines={1}
          >
            {item.desc}
          </Text>

          <Text
            style={styles.transactionCategory}
            numberOfLines={1}
          >
            {item.category}
          </Text>

          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>
              {formatDate(item.date)}
            </Text>

            {isPending && (
              <>
                <Text style={styles.metaDivider}>
                  •
                </Text>

                <Text style={styles.pendingText}>
                  Pending
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.transactionAmountWrap}>
          <Text
            style={[
              styles.transactionAmount,
              isCredit && styles.creditAmount,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {isCredit ? "+" : "-"}
            {formatAmount(item.amount)}
          </Text>
        </View>
      </View>
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

      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
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

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            Account details
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* ACCOUNT BALANCE */}

        <View style={styles.balanceSection}>
          <Text
            style={styles.accountName}
            numberOfLines={1}
          >
            {accountName}
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
            {formatAmount(availableBalance)}
          </Text>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceFooter}>
            <Text style={styles.balanceFooterLabel}>
              Current balance
            </Text>

            <Text style={styles.balanceFooterAmount}>
              {formatAmount(balance)}
            </Text>
          </View>
        </View>
      </View>

      {/* TRANSACTION CONTENT */}

      <View style={styles.content}>
        <View style={styles.contentHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              Transactions
            </Text>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {filteredTransactions.length}
              </Text>
            </View>
          </View>

          {/* FILTER TABS */}

          <View style={styles.filterRow}>
            {FILTERS.map((option) => {
              const active = filter === option;

              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setFilter(option)}
                  style={[
                    styles.filterTab,
                    active && styles.activeFilterTab,
                  ]}
                  activeOpacity={0.7}
                  accessibilityRole="tab"
                  accessibilityState={{
                    selected: active,
                  }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active && styles.activeFilterText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel="Search transactions"
            />

            {!!searchQuery && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
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

        {/* TRANSACTION LIST */}

        <SectionList
          style={styles.transactionList}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          renderSectionHeader={({
            section: { title },
          }) => (
            <View style={styles.monthHeader}>
              <Text style={styles.monthTitle}>
                {title}
              </Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={25}
                  color={colors.textSub}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {searchQuery.trim()
                  ? "No matching transactions"
                  : filter !== "All"
                    ? `No ${filter.toLowerCase()} transactions`
                    : "No transactions yet"}
              </Text>

              <Text style={styles.emptyDescription}>
                {searchQuery.trim()
                  ? "Try searching for a different transaction."
                  : "There are no transactions to display."}
              </Text>
            </View>
          }
        />
      </View>
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

  backButton: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
  },

  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
  },

  headerSpacer: {
    width: sizing.touchTarget,
  },

  // BALANCE

  balanceSection: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  accountName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E4E1FF",
    letterSpacing: 0.6,
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
    color: colors.white,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },

  balanceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },

  balanceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  balanceFooterLabel: {
    fontSize: 12,
    color: "#E4E1FF",
  },

  balanceFooterAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },

  // MAIN CONTENT

  content: {
    flex: 1,
    backgroundColor: colors.white,
  },

  contentHeader: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
  },

  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSub,
  },

  // FILTERS

  filterRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
    marginBottom: spacing.lg,
  },

  filterTab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  activeFilterTab: {
    borderBottomColor: colors.primary,
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSub,
  },

  activeFilterText: {
    color: colors.primaryDark,
    fontWeight: "700",
  },

  // SEARCH

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 14,
    color: colors.navy,
  },

  clearButton: {
    width: 30,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  // TRANSACTION LIST

  transactionList: {
    flex: 1,
  },

  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },

  monthHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },

  monthTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
  },

  transactionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    marginRight: spacing.md,
  },

  transactionInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },

  transactionName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  transactionCategory: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 3,
  },

  transactionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: 5,
  },

  transactionDate: {
    fontSize: 11,
    color: colors.textSub,
  },

  metaDivider: {
    fontSize: 11,
    color: colors.textLight,
  },

  pendingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A86E00",
  },

  transactionAmountWrap: {
    alignItems: "flex-end",
    justifyContent: "center",
    maxWidth: "42%",
  },

  transactionAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },

  creditAmount: {
    color: "#16875D",
  },

  // EMPTY STATE

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  emptyDescription: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 19,
  },
});