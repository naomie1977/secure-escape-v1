import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors } from "@/utils/theme";

type CashSendFilter = "All" | "Redeemed" | "Unredeemed";

type CashSendTransaction = {
  id: string;
  code: string;
  date: Date;
  amount: number;
  redeemed: boolean;
};

type GroupedTransactions = Record<string, CashSendTransaction[]>;

// Temporary screen data.
// This screen is not yet connected to a Cash Send history API.
const generateMockTransactions = (): CashSendTransaction[] => {
  const codes = [
    "C2958464139",
    "C3659407088",
    "C7837358089",
    "C4650940341",
    "C5448933886",
    "C3777415047",
    "C9123456789",
    "C8234567890",
    "C7345678901",
    "C6456789012",
    "C5567890123",
    "C4678901234",
    "C3789012345",
    "C2890123456",
    "C1901234567",
  ];

  const dates = [
    "2026-07-02T10:00:00Z",
    "2026-07-02T14:30:00Z",
    "2026-06-17T09:15:00Z",
    "2026-06-04T11:45:00Z",
    "2026-05-20T16:20:00Z",
    "2026-05-10T08:05:00Z",
    "2026-07-01T12:00:00Z",
    "2026-06-28T07:30:00Z",
    "2026-05-30T18:10:00Z",
    "2026-04-15T13:40:00Z",
    "2026-07-05T09:00:00Z",
    "2026-06-20T10:30:00Z",
    "2026-05-25T14:15:00Z",
    "2026-04-30T12:00:00Z",
    "2026-03-15T16:45:00Z",
  ];

  const amounts = [
    100,
    80,
    280,
    60,
    60,
    40,
    150,
    200,
    90,
    120,
    75,
    45,
    110,
    95,
    130,
  ];

  return codes.map((code, index) => ({
    id: index.toString(),
    code,
    date: new Date(dates[index % dates.length]),
    amount: amounts[index % amounts.length],
    redeemed: true,
  }));
};

const allTransactions = generateMockTransactions();

function isCashSendFilter(value: string | string[] | undefined): value is CashSendFilter {
  return (
    typeof value === "string" &&
    (value === "All" ||
      value === "Redeemed" ||
      value === "Unredeemed")
  );
}

function groupByMonth(
  transactions: CashSendTransaction[],
): GroupedTransactions {
  const groups: GroupedTransactions = {};

  transactions.forEach((transaction) => {
    const monthYear = transaction.date.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });

    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }

    groups[monthYear].push(transaction);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const aDate = groups[a][0]?.date.getTime() ?? 0;
    const bDate = groups[b][0]?.date.getTime() ?? 0;

    return bDate - aDate;
  });

  const sortedGroups: GroupedTransactions = {};

  sortedKeys.forEach((key) => {
    sortedGroups[key] = groups[key];
  });

  return sortedGroups;
}

export default function ScreenCashHistory() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    initialFilter?: string | string[];
  }>();

  const initialFilter: CashSendFilter = isCashSendFilter(
    params.initialFilter,
  )
    ? params.initialFilter
    : "All";

  const [activeFilter, setActiveFilter] =
    useState<CashSendFilter>(initialFilter);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((transaction) => {
      if (activeFilter === "Redeemed") {
        return transaction.redeemed;
      }

      if (activeFilter === "Unredeemed") {
        return !transaction.redeemed;
      }

      return true;
    });
  }, [activeFilter]);

  const groupedTransactions = useMemo(
    () => groupByMonth(filteredTransactions),
    [filteredTransactions],
  );

  const renderItem = ({
    item,
  }: {
    item: CashSendTransaction;
  }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyCode}>{item.code}</Text>

        <View style={styles.historyMeta}>
          <Text style={styles.historyDate}>
            {item.date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            })}
          </Text>

          <Text
            style={[
              styles.historyStatus,
              item.redeemed
                ? styles.redeemedStatus
                : styles.unredeemedStatus,
            ]}
          >
            {item.redeemed ? "Redeemed" : "Unredeemed"}
          </Text>
        </View>
      </View>

      <View style={styles.historyRight}>
        <Text style={styles.historyAmount}>
          -R{item.amount.toFixed(2)}
        </Text>

        <View style={styles.detailBtn}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.primary}
          />
        </View>
      </View>
    </View>
  );

  const renderGroup = (
    month: string,
    transactions: CashSendTransaction[],
  ) => (
    <View key={month} style={styles.groupContainer}>
      <Text style={styles.monthHeader}>{month}</Text>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="cash-outline"
        size={60}
        color={colors.greyLine}
      />

      <Text style={styles.emptyText}>
        You have no {activeFilter.toLowerCase()} transactions.
      </Text>
    </View>
  );

  const filters: CashSendFilter[] = [
    "All",
    "Redeemed",
    "Unredeemed",
  ];

  return (
    <View style={styles.container}>
      {/* Deep Purple Header */}
      <View style={styles.topPurpleCard}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerEyebrow}>TRANSACTIONS</Text>
            <Text style={styles.headerTitle}>Cash Send History</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.tabRow}>
          {filters.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  isActive && styles.activeTab,
                ]}
                onPress={() => setActiveFilter(tab)}
                accessibilityRole="button"
                accessibilityState={{
                  selected: isActive,
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {Object.keys(groupedTransactions).length === 0
            ? renderEmpty()
            : Object.entries(groupedTransactions).map(
                ([month, transactions]) =>
                  renderGroup(month, transactions),
              )}
        </ScrollView>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#EDF2F7",
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
    alignSelf: "center",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  activeTab: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#25145F",
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  groupContainer: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  monthHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    letterSpacing: 0.3,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  historyLeft: {
    flex: 1,
  },
  historyCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 10,
  },
  historyDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  redeemedStatus: {
    color: "#16A34A",
    backgroundColor: "#DCFCE7",
  },
  unredeemedStatus: {
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
  historyRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});