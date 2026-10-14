import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "@/utils/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { getAccounts } from "@/services/accountService";
import { AccountResponse } from "@/types/account";

const STATUS_META: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  Active: { label: "Active", bg: "#E6F7EE", color: "#1FA971" },
  Frozen: { label: "Frozen", bg: "#FFF6E5", color: "#B98900" },
  Suspended: { label: "Suspended", bg: "#FDECEC", color: "#E5484D" },
  Closed: { label: "Closed", bg: "#F1F1F1", color: "#64748B" },
};

const ACCOUNT_ACCENTS: string[] = [
  colors.primary,
  "#3B63C4",
  "#1FA971",
];

const maskAccountNumber = (accountNumber: string) => {
  const last4 = accountNumber.slice(-4);
  return `•••• ${last4}`;
};

export default function AccountsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, []),
  );

  const handleAccountPress = (account: AccountResponse) => {
    router.push({
      pathname: "/accounts/account-detail",
      params: { id: account.id },
    });
  };

  const formatAmount = (amount: number, currency: string) =>
    `${currency === "ZAR" ? "R" : currency} ${amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <View style={styles.container}>
      {/* App bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Accounts</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        )}

        {error && !isLoading && (
          <TouchableOpacity
            style={styles.errorRow}
            onPress={loadAccounts}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>Retry</Text>
          </TouchableOpacity>
        )}

        {!isLoading && !error && accounts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="wallet-outline"
              size={32}
              color={colors.textLight}
            />
            <Text style={styles.emptyTitle}>No accounts yet</Text>
            <Text style={styles.emptyText}>
              Your accounts will appear here once they are set up.
            </Text>
          </View>
        )}

        {!isLoading && !error && accounts.length > 0 && (
          <View style={styles.list}>
            {accounts.map((account, index) => {
              const statusMeta =
                STATUS_META[account.status] ?? STATUS_META.Active;
              const accent = ACCOUNT_ACCENTS[index % ACCOUNT_ACCENTS.length];

              return (
                <TouchableOpacity
                  key={account.id}
                  activeOpacity={0.7}
                  onPress={() => handleAccountPress(account)}
                  style={styles.row}
                >
                  <View
                    style={[styles.rowAccent, { backgroundColor: accent }]}
                  />

                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {account.accountName}
                      </Text>
                      <Text style={styles.rowAmount} numberOfLines={1}>
                        {formatAmount(
                          account.availableBalance,
                          account.currency,
                        )}
                      </Text>
                    </View>

                    <View style={styles.rowMetaLine}>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {account.accountType}
                      </Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {maskAccountNumber(account.accountNumber)}
                      </Text>
                    </View>

                    <View style={styles.rowBadges}>
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
                      {account.isDecoyView && (
                        <View style={styles.decoyBadge}>
                          <Text style={styles.decoyText}>Decoy view</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textLight}
                    style={styles.rowChevron}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.greyBg },

  /* App bar */
  appBar: {
    paddingTop: 56,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  /* Scroll */
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  /* States */
  stateWrap: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.md,
  },
  errorText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "500",
  },
  errorRetry: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  /* Empty */
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
  },

  /* List */
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },

  row: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  rowAccent: {
    width: 4,
  },
  rowBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowChevron: {
    alignSelf: "center",
    marginRight: spacing.md,
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },

  rowMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textSub,
    flexShrink: 1,
  },
  dot: {
    fontSize: 12,
    color: colors.textLight,
  },

  rowBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
    textTransform: "uppercase",
  },
  decoyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  decoyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: 0.1,
    textTransform: "uppercase",
  },
});