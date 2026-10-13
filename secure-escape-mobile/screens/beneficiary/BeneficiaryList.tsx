import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, sizing } from "@/utils/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { getBeneficiaries } from "@/services/beneficiaryService";
import { BeneficiaryResponse } from "@/types/beneficiary";

// ─────────────────────────────────────────────
// TYPES & HELPERS
// ─────────────────────────────────────────────

type SortOption = "Recently paid" | "Recently added";

const formatLastPaid = (lastPaidAt?: string | null) => {
  if (!lastPaidAt) return "Never paid";

  const paidDate = new Date(lastPaidAt);

  if (Number.isNaN(paidDate.getTime())) {
    return "Never paid";
  }

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const paymentDay = new Date(
    paidDate.getFullYear(),
    paidDate.getMonth(),
    paidDate.getDate()
  );

  const diffDays = Math.floor(
    (today.getTime() - paymentDay.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Paid today";
  if (diffDays === 1) return "Paid yesterday";

  if (diffDays > 1 && diffDays < 7) {
    return `Paid ${diffDays} days ago`;
  }

  return `Last paid ${paidDate.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?"
  );
};

// ─────────────────────────────────────────────
// BENEFICIARY LIST
// ─────────────────────────────────────────────

export default function BeneficiaryList() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<
    BeneficiaryResponse[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, setSortBy] =
    useState<SortOption>("Recently paid");

  // ───────────────────────────────────────────
  // DATA LOADING
  // ───────────────────────────────────────────

  const loadBeneficiaries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getBeneficiaries();

      setBeneficiaries(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load beneficiaries."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBeneficiaries();
    }, [loadBeneficiaries])
  );

  // ───────────────────────────────────────────
  // SORTING & SEARCH
  // ───────────────────────────────────────────

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = beneficiaries.filter((item) => {
      if (!query) return true;

      return [
        item.name,
        item.bankName,
        item.accountNumber,
        item.reference,
        item.status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "Recently added") {
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      }

      return (
        new Date(b.lastPaidAt ?? 0).getTime() -
        new Date(a.lastPaidAt ?? 0).getTime()
      );
    });
  }, [beneficiaries, searchQuery, sortBy]);

  const toggleSort = () => {
    setSortBy((current) =>
      current === "Recently paid"
        ? "Recently added"
        : "Recently paid"
    );
  };

  // ───────────────────────────────────────────
  // NAVIGATION
  // ───────────────────────────────────────────

  const handleBeneficiaryPress = (
    item: BeneficiaryResponse
  ) => {
    router.push({
      pathname: "/transactions/create-transaction",
      params: {
        beneficiaryId: item.id,
        beneficiaryName: item.name,
        reference: item.reference,
      },
    });
  };

  const handleAddBeneficiary = () => {
    router.push("/beneficiaries/add-beneficiary");
  };

  // ───────────────────────────────────────────
  // BENEFICIARY ROW
  // ───────────────────────────────────────────

  const renderItem = ({
    item,
  }: {
    item: BeneficiaryResponse;
  }) => {
    const displayName = item.name || "Unknown";
    const initials = getInitials(displayName);

    return (
      <TouchableOpacity
        style={styles.beneficiaryRow}
        activeOpacity={0.7}
        onPress={() => handleBeneficiaryPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Pay ${displayName}`}
      >
        {/* RECIPIENT INITIALS */}

        <View style={styles.initialsContainer}>
          <Text style={styles.initialsText}>
            {initials}
          </Text>
        </View>

        {/* RECIPIENT DETAILS */}

        <View style={styles.beneficiaryInfo}>
          <Text
            style={styles.beneficiaryName}
            numberOfLines={1}
          >
            {displayName}
          </Text>

          <Text
            style={styles.bankDetails}
            numberOfLines={1}
          >
            {[
              item.bankName,
              item.accountNumber,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>

          <View style={styles.paymentHistory}>
            <Ionicons
              name="time-outline"
              size={12}
              color={colors.textSub}
            />

            <Text
              style={styles.lastPaid}
              numberOfLines={1}
            >
              {formatLastPaid(item.lastPaidAt)}
            </Text>
          </View>
        </View>

        {/* NAVIGATION */}

        <View style={styles.rowAction}>
          <Ionicons
            name="chevron-forward"
            size={17}
            color={colors.textSub}
          />
        </View>
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

      {/* ─────────────────────────────
          PURPLE HEADER
      ───────────────────────────── */}

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
            Pay beneficiary
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        {/* HEADER CONTENT */}

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            YOUR RECIPIENTS
          </Text>

          <Text style={styles.headerHeading}>
            Who are you paying?
          </Text>

          <Text style={styles.headerDescription}>
            Select a saved beneficiary to make a payment.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="people-outline"
              size={16}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            Manage your saved beneficiaries
          </Text>
        </View>
      </View>

      {/* ─────────────────────────────
          MAIN CONTENT
      ───────────────────────────── */}

      <View style={styles.content}>

        {/* SECTION HEADING */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>
              Beneficiaries
            </Text>

            {!loading && !error && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {beneficiaries.length}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddBeneficiary}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add beneficiary"
          >
            <Ionicons
              name="add"
              size={19}
              color={colors.white}
            />

            <Text style={styles.addButtonText}>
              Add new
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH */}

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={19}
              color={colors.textSub}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Search beneficiaries"
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel="Search beneficiaries"
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

        {/* SORT CONTROLS */}

        <View style={styles.listToolbar}>
          <View style={styles.listLabelGroup}>
            <Text style={styles.listLabel}>
              SAVED BENEFICIARIES
            </Text>
          </View>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={toggleSort}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sortBy}. Tap to change sorting`}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={15}
              color={colors.primaryDark}
            />

            <Text style={styles.sortText}>
              {sortBy}
            </Text>

            <Ionicons
              name="chevron-down"
              size={13}
              color={colors.textSub}
            />
          </TouchableOpacity>
        </View>

        {/* ─────────────────────────
            BENEFICIARY LIST
        ───────────────────────── */}

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              color={colors.primary}
              size="small"
            />

            <Text style={styles.stateDescription}>
              Loading beneficiaries…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={26}
                color={colors.textSub}
              />
            </View>

            <Text style={styles.stateTitle}>
              Couldn't load beneficiaries
            </Text>

            <Text style={styles.stateDescription}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadBeneficiaries}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons
                name="refresh-outline"
                size={17}
                color={colors.white}
              />

              <Text style={styles.retryButtonText}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              filteredData.length === 0
                ? styles.emptyListContent
                : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.stateIcon}>
                  <Ionicons
                    name={
                      searchQuery.trim()
                        ? "search-outline"
                        : "people-outline"
                    }
                    size={26}
                    color={colors.textSub}
                  />
                </View>

                <Text style={styles.stateTitle}>
                  {searchQuery.trim()
                    ? "No matching beneficiaries"
                    : "No beneficiaries yet"}
                </Text>

                <Text style={styles.stateDescription}>
                  {searchQuery.trim()
                    ? "Try searching by name, bank or account number."
                    : "Add a beneficiary to make your first payment."}
                </Text>

                {!searchQuery.trim() && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleAddBeneficiary}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="add"
                      size={19}
                      color={colors.white}
                    />

                    <Text style={styles.retryButtonText}>
                      Add beneficiary
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
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

  // ─────────────────────────
  // PURPLE HEADER
  // ─────────────────────────

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

  // ─────────────────────────
  // MAIN CONTENT
  // ─────────────────────────

  content: {
    flex: 1,
    backgroundColor: colors.white,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },

  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  countBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },

  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSub,
    fontVariant: ["tabular-nums"],
  },

  // ─────────────────────────
  // ADD BUTTON
  // ─────────────────────────

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    gap: 5,
  },

  addButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },

  // ─────────────────────────
  // SEARCH
  // ─────────────────────────

  searchSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    gap: spacing.sm,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: colors.navy,
    paddingVertical: 0,
  },

  clearButton: {
    width: 32,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  // ─────────────────────────
  // LIST TOOLBAR
  // ─────────────────────────

  listToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
    gap: spacing.sm,
  },

  listLabelGroup: {
    flex: 1,
    minWidth: 0,
  },

  listLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.3,
  },

  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    gap: 5,
  },

  sortText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },

  // ─────────────────────────
  // BENEFICIARY LIST
  // ─────────────────────────

  list: {
    flex: 1,
  },

  listContent: {
    paddingBottom: spacing.xxxl,
  },

  beneficiaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
    backgroundColor: colors.white,
  },

  initialsContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },

  initialsText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },

  beneficiaryInfo: {
    flex: 1,
    minWidth: 0,
  },

  beneficiaryName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  bankDetails: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 4,
  },

  paymentHistory: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: 4,
  },

  lastPaid: {
    flex: 1,
    fontSize: 11,
    color: colors.textSub,
  },

  rowAction: {
    width: 28,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },

  // ─────────────────────────
  // LOADING & EMPTY STATES
  // ─────────────────────────

  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },

  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
  },

  stateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  stateDescription: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 19,
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },

  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});
