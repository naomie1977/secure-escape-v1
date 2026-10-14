import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { getAccounts } from "@/services/accountService";
import { AccountResponse } from "@/types/account";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/utils/theme";
import { getProfileMe } from "@/services/profileService";
import { ProfileMeResponse } from "@/types/profile";
import { useRouter, useFocusEffect } from "expo-router";
import { logout } from "@/services/authService";
import {
  AreaSafetyResult,
  checkAreaSafety,
} from "@/services/areaSafetyService";
import { notifyForAreaSafety } from "@/services/areaSafetyNotificationService";
import { createMessage } from "@/services/messageService";

export default function HomeScreen() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [profile, setProfile] = useState<ProfileMeResponse>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [areaSafety, setAreaSafety] =
    useState<AreaSafetyResult | null>(null);
  const [isAreaSafetyLoading, setIsAreaSafetyLoading] = useState(true);
  const [areaSafetyError, setAreaSafetyError] = useState<string | null>(
    null,
  );

  const isDuress = profile?.sessionMode === "Duress";

  useEffect(() => {
    loadAccounts();
    loadProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshHome = async () => {
        loadAccounts();

        try {
          const currentProfile = await getProfileMe();

          if (!isActive) {
            return;
          }

          setProfile(currentProfile);

          if (currentProfile.sessionMode === "Duress") {
            setAreaSafety(null);
            setAreaSafetyError(null);
            setIsAreaSafetyLoading(false);
            return;
          }

          await loadAreaSafety();
        } catch (profileError) {
          console.error(
            "Failed to refresh Home session mode:",
            profileError,
          );

          if (isActive) {
            setIsAreaSafetyLoading(false);
          }
        }
      };

      void refreshHome();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await getProfileMe();
      setProfile(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load profile.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load accounts.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logoutButton = async () => {
    try {
      await logout();
      router.replace("/(auth)");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to Logout",
      );
    }
  };

  const loadAreaSafety = async () => {
    try {
      setIsAreaSafetyLoading(true);
      setAreaSafetyError(null);

      const result = await checkAreaSafety();
      setAreaSafety(result);

      const alertableStatuses: AreaSafetyResult["status"][] = [
        "inside-high",
        "inside-medium",
        "nearby-high",
        "nearby-medium",
      ];

      if (
        result.nearestZone &&
        alertableStatuses.includes(result.status)
      ) {
        const zone = result.nearestZone;
        const today = new Date().toISOString().slice(0, 10);

        let title = "Area Safety Alert";
        let body =
          "A safety awareness zone is near your current area. Stay aware of your surroundings.";

        switch (result.status) {
          case "inside-high":
            title = "Higher-risk area";
            body = `You are currently within the ${zone.name} safety awareness zone. Stay aware of your surroundings.`;
            break;

          case "inside-medium":
            title = "Elevated-risk area";
            body = `You are currently within the ${zone.name} safety awareness zone. Stay aware of your surroundings.`;
            break;

          case "nearby-high":
            title = "Higher-risk area nearby";
            body = `${zone.name} is near your current area. Stay aware of your surroundings.`;
            break;

          case "nearby-medium":
            title = "Elevated-risk area nearby";
            body = `${zone.name} is near your current area. Stay aware of your surroundings.`;
            break;
        }

        try {
          await createMessage({
            title,
            body,
            category: "AreaSafety",
            referenceType: "RiskZone",
            referenceId: zone.id,
            deduplicationKey: `area-safety:${zone.id}:${result.status}:${today}`,
          });
        } catch (messageError) {
          console.warn(
            "Area Safety message could not be saved:",
            messageError,
          );
        }
      }

      try {
        await notifyForAreaSafety(result);
      } catch (notificationError) {
        console.warn(
          "Area Safety notification could not be delivered:",
          notificationError,
        );
      }
    } catch (err) {
      setAreaSafety(null);

      setAreaSafetyError(
        err instanceof Error
          ? err.message
          : "Area Safety is temporarily unavailable.",
      );
    } finally {
      setIsAreaSafetyLoading(false);
    }
  };

  const accountRows = accounts.map((account, index) => ({
    id: account.id,
    name: account.accountName,
    balance: account.availableBalance,
    isDecoyView: account.isDecoyView,
    icon:
      index === 0
        ? "wallet-outline"
        : "trending-up-outline",
    accent:
      index === 0
        ? colors.primary
        : colors.navy,
  }));

  const favourites = [
    {
      label: "Pay Beneficiary",
      icon: "people-outline",
      link: "/beneficiaries/beneficiary-list",
    },
    {
      label: "Transfer",
      icon: "swap-horizontal-outline",
      link: "/beneficiaries/beneficiary-list",
    },
    {
      label: "Send Cash",
      icon: "cash-outline",
      link: "/transactions/create-cash-send",
    },
    {
      label: "Cards",
      icon: "card-outline",
      link: "/(tabs)/cards",
    },
    {
      label: "Transaction Report",
      icon: "stats-chart-outline",
      link: "/transactions/report",
    },
    {
      label: "Financial Advice",
      icon: "document-text-outline",
      link: "/advice/financial-advice",
    },
    {
      label: "Security Tips",
      icon: "shield-checkmark-outline",
      link: "/advice/security-tips",
    },
  ];

  const handleFavPress = (item: (typeof favourites)[0]) => {
    if (item.link) {
      router.push(item.link as never);
      return;
    }

    Alert.alert(
      "Coming Soon",
      `The "${item.label}" feature will be available in the next sprint.`,
      [{ text: "OK", style: "default" }],
    );
  };

  const openAreaSafety = () => {
    if (isDuress) {
      return;
    }

    router.push("/area-safety" as never);
  };

  const formatDistance = (meters: number | null) => {
    if (meters === null) {
      return null;
    }

    const safeMeters = Math.max(0, meters);

    if (safeMeters < 1000) {
      return `${Math.round(safeMeters)} m`;
    }

    return `${(safeMeters / 1000).toFixed(1)} km`;
  };

  const formatCurrency = (value: number) =>
    `R ${value.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getAreaSafetyContent = () => {
    if (!areaSafety) {
      return {
        title: "Area Safety",
        message: "No elevated-risk areas detected nearby.",
        icon: "shield-checkmark-outline" as const,
        tone: "clear" as const,
      };
    }

    const zone = areaSafety.nearestZone;

    switch (areaSafety.status) {
      case "inside-high":
        return {
          title: "Higher-risk area",
          message: zone
            ? `You are currently within the ${zone.name} safety awareness zone. Stay aware of your surroundings.`
            : "You are currently within a higher-risk safety awareness zone.",
          icon: "warning-outline" as const,
          tone: "high" as const,
        };

      case "inside-medium":
        return {
          title: "Elevated-risk area",
          message: zone
            ? `You are currently within the ${zone.name} safety awareness zone. Stay aware of your surroundings.`
            : "You are currently within an elevated-risk safety awareness zone.",
          icon: "alert-circle-outline" as const,
          tone: "medium" as const,
        };

      case "nearby-high": {
        const distance = formatDistance(
          areaSafety.distanceToNearestZoneBoundaryMeters,
        );

        return {
          title: "Higher-risk area nearby",
          message: zone
            ? `${zone.name} is${distance ? ` about ${distance}` : ""} from your current area.`
            : "A higher-risk safety awareness zone is nearby.",
          icon: "warning-outline" as const,
          tone: "high" as const,
        };
      }

      case "nearby-medium": {
        const distance = formatDistance(
          areaSafety.distanceToNearestZoneBoundaryMeters,
        );

        return {
          title: "Elevated-risk area nearby",
          message: zone
            ? `${zone.name} is${distance ? ` about ${distance}` : ""} from your current area.`
            : "An elevated-risk safety awareness zone is nearby.",
          icon: "alert-circle-outline" as const,
          tone: "medium" as const,
        };
      }

      default:
        return {
          title: "Area Safety",
          message: "No elevated-risk areas detected nearby.",
          icon: "shield-checkmark-outline" as const,
          tone: "clear" as const,
        };
    }
  };

  const areaSafetyContent = getAreaSafetyContent();

  return (
    <View style={styles.pageContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
      />

      {/* ─────────────────────────────
          PURPLE DASHBOARD HEADER
      ───────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerEyebrow}>MY DASHBOARD</Text>
            <View style={styles.headerAccent} />
          </View>

          <TouchableOpacity
            style={styles.headerAction}
            onPress={logoutButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Log out"
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={21}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeLabel}>Welcome back,</Text>
          <Text
            style={styles.userName}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {profile?.fullName || "User"}
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="grid-outline"
              size={15}
              color="#E4E1FF"
            />
          </View>
          <Text style={styles.headerFooterText}>
            Your money, at a glance
          </Text>
        </View>
      </View>

      {/* ─────────────────────────────
          DASHBOARD CONTENT
      ───────────────────────────── */}
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* LOADING */}
        {isLoading && (
          <View style={styles.stateRow}>
            <ActivityIndicator
              color={colors.primary}
              size="small"
            />
            <Text style={styles.stateText}>
              Loading accounts...
            </Text>
          </View>
        )}

        {/* ERROR */}
        {error && !isLoading && (
          <TouchableOpacity
            style={styles.errorRow}
            onPress={loadAccounts}
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.dangerStrong}
            />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>Retry</Text>
          </TouchableOpacity>
        )}

        {/* ─────────────────────────
            ACCOUNTS
        ───────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accounts</Text>
            <Text style={styles.sectionMeta}>
              {accounts.length} active account
              {accounts.length === 1 ? "" : "s"}
            </Text>
          </View>

          <View style={styles.accountsList}>
            {accountRows.map((account) => (
              <TouchableOpacity
                key={account.id}
                activeOpacity={0.7}
                style={styles.accountRow}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/accounts/account-detail",
                    params: {
                      accountId: account.id,
                      accountName: account.name,
                      balance: account.balance.toString(),
                    },
                  })
                }
              >
                <View
                  style={[
                    styles.accountAccent,
                    { backgroundColor: account.accent },
                  ]}
                />

                <View style={styles.accountBody}>
                  <View style={styles.accountIcon}>
                    <Ionicons
                      name={
                        account.icon as keyof typeof Ionicons.glyphMap
                      }
                      size={20}
                      color={account.accent}
                    />
                  </View>

                  <View style={styles.accountText}>
                    <Text
                      style={styles.accountName}
                      numberOfLines={1}
                    >
                      {account.name}
                    </Text>

                    <Text
                      style={styles.accountBalance}
                      numberOfLines={1}
                    >
                      {formatCurrency(account.balance)}
                    </Text>

                    {account.isDecoyView && (
                      <Text style={styles.decoyBadge}>
                        Decoy view
                      </Text>
                    )}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textLight}
                  />
                </View>
              </TouchableOpacity>
            ))}

            {!isLoading &&
              !error &&
              accountRows.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>
                    No accounts yet
                  </Text>
                  <Text style={styles.emptyText}>
                    Your accounts will appear here once they are set up.
                  </Text>
                </View>
              )}
          </View>
        </View>

        {/* ─────────────────────────
            AREA SAFETY
        ───────────────────────── */}
        {!isDuress && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Area Safety</Text>
                <Text style={styles.sectionMeta}>
                  Awareness based on your current location
                </Text>
              </View>

              {!isAreaSafetyLoading && (
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={loadAreaSafety}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh Area Safety"
                >
                  <Ionicons
                    name="refresh"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.areaSafetyContainer}>
              {isAreaSafetyLoading ? (
                <View style={styles.areaSafetyCard}>
                  <View style={styles.areaSafetyLoadingRow}>
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                    />
                    <View style={styles.areaSafetyTextContainer}>
                      <Text style={styles.areaSafetyCardTitle}>
                        Checking your area
                      </Text>
                      <Text style={styles.areaSafetyMessage}>
                        Getting current Area Safety information...
                      </Text>
                    </View>
                  </View>
                </View>
              ) : areaSafetyError ? (
                <TouchableOpacity
                  style={[
                    styles.areaSafetyCard,
                    styles.areaSafetyUnavailableCard,
                  ]}
                  onPress={loadAreaSafety}
                  activeOpacity={0.8}
                >
                  <View style={styles.areaSafetyLoadingRow}>
                    <View
                      style={[
                        styles.areaSafetyIcon,
                        styles.areaSafetyUnavailableIcon,
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={colors.textSub}
                      />
                    </View>
                    <View style={styles.areaSafetyTextContainer}>
                      <Text style={styles.areaSafetyCardTitle}>
                        Area Safety unavailable
                      </Text>
                      <Text style={styles.areaSafetyMessage}>
                        {areaSafetyError}
                      </Text>
                      <Text style={styles.areaSafetyRetry}>
                        Tap to try again
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.areaSafetyCard,
                    areaSafetyContent.tone === "high" &&
                      styles.areaSafetyHighCard,
                    areaSafetyContent.tone === "medium" &&
                      styles.areaSafetyMediumCard,
                  ]}
                  onPress={openAreaSafety}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Open Area Safety map"
                >
                  <View style={styles.areaSafetyLoadingRow}>
                    <View
                      style={[
                        styles.areaSafetyIcon,
                        areaSafetyContent.tone === "clear" &&
                          styles.areaSafetyClearIcon,
                        areaSafetyContent.tone === "high" &&
                          styles.areaSafetyHighIcon,
                        areaSafetyContent.tone === "medium" &&
                          styles.areaSafetyMediumIcon,
                      ]}
                    >
                      <Ionicons
                        name={areaSafetyContent.icon}
                        size={20}
                        color={
                          areaSafetyContent.tone === "high"
                            ? "#DC2626"
                            : areaSafetyContent.tone === "medium"
                              ? "#D97706"
                              : colors.primary
                        }
                      />
                    </View>

                    <View style={styles.areaSafetyTextContainer}>
                      <Text style={styles.areaSafetyCardTitle}>
                        {areaSafetyContent.title}
                      </Text>
                      <Text style={styles.areaSafetyMessage}>
                        {areaSafetyContent.message}
                      </Text>
                      <View style={styles.areaSafetyMapLink}>
                        <Text style={styles.areaSafetyMapLinkText}>
                          View safety map
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={colors.primary}
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ─────────────────────────
            QUICK ACTIONS
        ───────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Quick actions</Text>
              <Text style={styles.sectionMeta}>
                Move money and stay informed
              </Text>
            </View>
          </View>

          <View style={styles.favGrid}>
            {favourites.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.favTile}
                activeOpacity={0.7}
                onPress={() => handleFavPress(item)}
              >
                <View style={styles.favIconWrap}>
                  <Ionicons
                    name={
                      item.icon as keyof typeof Ionicons.glyphMap
                    }
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.favLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 24,
    paddingBottom: 33,
  },

  // ─────────────────────────
  // PURPLE HEADER
  // ─────────────────────────

  header: {
    backgroundColor: colors.primaryDark,
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 24) + 12
        : 64,
    paddingHorizontal: 24,
    paddingBottom: 26,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  headerTitleGroup: {
    flex: 1,
  },

  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E4E1FF",
    letterSpacing: 1.1,
  },

  headerAccent: {
    width: 28,
    height: 2,
    backgroundColor: "#B5A9FF",
    borderRadius: 1,
    marginTop: 9,
  },

  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.17)",
  },

  welcomeSection: {
    marginBottom: 25,
  },

  welcomeLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#E4E1FF",
    marginBottom: 5,
  },

  userName: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.7,
    lineHeight: 39,
  },

  headerDivider: {
    display: "none",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
    marginBottom: 16,
  },

  headerFooter: {
    display: "none",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  headerFooterIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  headerFooterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E4E1FF",
    letterSpacing: 0.1,
  },

  // ─────────────────────────
  // LOADING & ERROR
  // ─────────────────────────

  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  stateText: {
    color: colors.textSub,
    fontSize: 13,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 8,
  },

  errorText: {
    flex: 1,
    color: colors.dangerStrong,
    fontSize: 13,
    fontWeight: "500",
  },

  errorRetry: {
    color: colors.dangerStrong,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  // ─────────────────────────
  // SECTIONS
  // ─────────────────────────

  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },

  sectionMeta: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 3,
  },

  // ─────────────────────────
  // ACCOUNTS
  // ─────────────────────────

  accountsList: {
    paddingHorizontal: 16,
    gap: 8,
  },

  accountRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },

  accountAccent: {
    width: 4,
  },

  accountBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },

  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },

  accountText: {
    flex: 1,
  },

  accountName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },

  accountBalance: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.credit,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },

  decoyBadge: {
    fontSize: 11,
    color: colors.warning,
    marginTop: 4,
    fontWeight: "600",
  },

  emptyState: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  emptyText: {
    fontSize: 13,
    color: colors.textSub,
    marginTop: 4,
    textAlign: "center",
  },

  // ─────────────────────────
  // AREA SAFETY
  // ─────────────────────────

  areaSafetyContainer: {
    paddingHorizontal: 16,
  },

  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  areaSafetyCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  areaSafetyHighCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },

  areaSafetyMediumCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FED7AA",
  },

  areaSafetyUnavailableCard: {
    backgroundColor: colors.surfaceMuted,
  },

  areaSafetyLoadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  areaSafetyIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: colors.primarySubtle,
  },

  areaSafetyClearIcon: {
    backgroundColor: colors.primarySubtle,
  },

  areaSafetyHighIcon: {
    backgroundColor: "#FEE2E2",
  },

  areaSafetyMediumIcon: {
    backgroundColor: "#FEF3C7",
  },

  areaSafetyUnavailableIcon: {
    backgroundColor: colors.surfaceMuted,
  },

  areaSafetyTextContainer: {
    flex: 1,
  },

  areaSafetyCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  areaSafetyMessage: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSub,
  },

  areaSafetyRetry: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },

  areaSafetyMapLink: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  areaSafetyMapLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },

  // ─────────────────────────
  // QUICK ACTIONS
  // ─────────────────────────

  favGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },

  favTile: {
    width: "30.5%",
    minHeight: 104,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  favIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySubtle,
    marginBottom: 8,
  },

  favLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
    textAlign: "center",
    lineHeight: 16,
  },
});
