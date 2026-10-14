import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { colors } from "@/utils/theme";
import { TransactionResponse } from "@/types/transaction";
import { getTransactions } from "@/services/transactionServices";

type TransactionMeta = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  bg: string;
  color: string;
};

const TYPE_META: Record<string, TransactionMeta> = {
  Transfer: {
    icon: "swap-horizontal-outline",
    label: "Transfer",
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

const STATUS_META: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  Approved: {
    label: "Approved",
    bg: "#EAF7F0",
    color: "#168452",
  },
  // Intentionally identical to Approved.
  DecoyApproved: {
    label: "Approved",
    bg: "#EAF7F0",
    color: "#168452",
  },
  Failed: {
    label: "Failed",
    bg: "#FDECEC",
    color: "#B42332",
  },
  Pending: {
    label: "Pending",
    bg: "#FFF5E5",
    color: "#9A6700",
  },
  Blocked: {
    label: "Blocked",
    bg: "#FDECEC",
    color: "#B42332",
  },
  Delayed: {
    label: "Delayed",
    bg: "#FFF5E5",
    color: "#9A6700",
  },
};

const DEFAULT_TYPE: TransactionMeta = {
  icon: "receipt-outline",
  label: "Transaction",
  bg: colors.surfaceMuted,
  color: colors.primaryDark,
};

const DEFAULT_STATUS = {
  label: "Unknown",
  bg: colors.surfaceMuted,
  color: colors.textSub,
};

const formatAmount = (amount: number, currency: string) =>
  `${currency === "ZAR" ? "R" : currency} ${amount.toLocaleString(
    "en-ZA",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;

const formatDate = (createdAt: string) => {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function TransactionReport() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<
    TransactionResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getTransactions();
      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load transactions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever this screen becomes focused.
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...transactions]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .filter((item) => {
        if (!query) return true;

        return [
          item.beneficiaryName,
          item.bankReference,
          item.description,
          item.amount?.toString(),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );
      });
  }, [transactions, searchQuery]);

  const handleTransactionPress = (
    transaction: TransactionResponse
  ) => {
    router.push({
      pathname: "/transactions/transaction-detail",
      params: {
        transaction: JSON.stringify(transaction),
      },
    });
  };

  const renderTransaction = ({
    item,
  }: {
    item: TransactionResponse;
  }) => {
    const typeMeta =
      TYPE_META[item.transactionType] ?? DEFAULT_TYPE;

    const statusMeta =
      STATUS_META[item.status] ?? DEFAULT_STATUS;

    return (
      <TouchableOpacity
        style={styles.transactionRow}
        onPress={() => handleTransactionPress(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`View transaction: ${
          item.beneficiaryName || typeMeta.label
        }, ${formatAmount(item.amount, item.currency)}, ${
          statusMeta.label
        }`}
      >
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: typeMeta.bg },
          ]}
        >
          <Ionicons
            name={typeMeta.icon}
            size={22}
            color={typeMeta.color}
          />
        </View>

        <View style={styles.transactionInfo}>
          <Text
            style={styles.transactionName}
            numberOfLines={1}
          >
            {item.beneficiaryName || typeMeta.label}
          </Text>

          <Text
            style={styles.transactionReference}
            numberOfLines={1}
          >
            {typeMeta.label}
            {!!item.bankReference
              ? ` · ${item.bankReference}`
              : ""}
          </Text>

          <View style={styles.dateRow}>
            <Ionicons
              name="time-outline"
              size={12}
              color={colors.textSub}
            />

            <Text style={styles.transactionDate}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.amountColumn}>
          <Text
            style={styles.transactionAmount}
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
            <Text
              style={[
                styles.statusText,
                { color: statusMeta.color },
              ]}
            >
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={15}
          color={colors.textSub}
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
            Transaction history
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            ACCOUNT ACTIVITY
          </Text>

          <Text style={styles.headerHeading}>
            Your transactions
          </Text>

          <Text style={styles.headerDescription}>
            Review your payments and cash sends
            in one place.
          </Text>
        </View>
      </View>

      {/* SEARCH AND SECTION HEADING */}
      <View style={styles.topContent}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSub}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search name, reference or amount"
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            accessibilityLabel="Search transactions"
          />

          {!!searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={colors.textSub}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Recent activity
          </Text>

          {!loading && !error && (
            <Text style={styles.resultsCount}>
              {filteredData.length} results
            </Text>
          )}
        </View>
      </View>

      {/* TRANSACTION LIST */}
      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.stateDescription}>
            Loading transactions…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={colors.primaryDark}
            />
          </View>

          <Text style={styles.stateTitle}>
            Couldn't load transactions
          </Text>

          <Text style={styles.stateDescription}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadTransactions}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            filteredData.length === 0 &&
              styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name={
                    searchQuery.trim()
                      ? "search-outline"
                      : "receipt-outline"
                  }
                  size={28}
                  color={colors.primaryDark}
                />
              </View>

              <Text style={styles.stateTitle}>
                {searchQuery.trim()
                  ? "No matching transactions"
                  : "No transactions yet"}
              </Text>

              <Text style={styles.stateDescription}>
                {searchQuery.trim()
                  ? "Try searching for another name, reference or amount."
                  : "Your transactions will appear here once you make a payment."}
              </Text>

              {!!searchQuery.trim() && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery("")}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearSearchText}>
                    Clear search
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

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
    maxWidth: 300,
  },

  // SEARCH AREA
  topContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.greyLine || colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    paddingVertical: 0,
    fontSize: 14,
    color: colors.navy,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 26,
    marginBottom: 12,
    gap: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  resultsCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSub,
  },

  // TRANSACTION LIST
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 94,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine || colors.border,
    gap: 11,
  },

  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },

  transactionName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  transactionReference: {
    fontSize: 11,
    color: colors.textSub,
    marginTop: 5,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 4,
  },

  transactionDate: {
    fontSize: 11,
    color: colors.textSub,
  },

  amountColumn: {
    alignItems: "flex-end",
    maxWidth: "36%",
  },

  transactionAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },

  statusBadge: {
    marginTop: 7,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  rowChevron: {
    marginLeft: -5,
  },

  // EMPTY / LOADING / ERROR STATES
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 50,
  },

  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySubtle,
    marginBottom: 15,
  },

  stateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
  },

  stateDescription: {
    marginTop: 7,
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 19,
  },

  retryButton: {
    minHeight: 44,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },

  clearSearchButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.primarySubtle,
  },

  clearSearchText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
});

