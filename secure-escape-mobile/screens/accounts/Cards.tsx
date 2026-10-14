
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/utils/theme";
import { getAccounts } from "@/services/accountService";
import { AccountResponse } from "@/types/account";
import { getProfileMe } from "@/services/profileService";
import { ProfileMeResponse } from "@/types/profile";

// Subtle variations within the same visual identity.
const CARD_GRADIENTS: readonly (readonly [string, string])[] = [
  ["#25145F", "#25145F"],
  ["#39316D", "#211A47"],
  ["#25145F", "#25145F"],
  ["#343D72", "#202746"],
];

type DisplayCard = {
  id: string;
  type: string;
  number: string;
  displayNumber: string;
  status: string;
  gradient: readonly [string, string];
  bank: string;
  holder: string;
  accountNumber: string;
  accountType: string;
  expiry: string;
  cvv: string;
};

const maskAccountNumber = (value: string) => {
  const digits = value.replace(/\s/g, "");

  if (!digits) return "••••  ••••";

  return `••••  ${digits.slice(-4)}`;
};

export default function CardsScreen() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [profile, setProfile] = useState<ProfileMeResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [accountsData, profileData] = await Promise.all([
        getAccounts(),
        getProfileMe(),
      ]);

      setAccounts(accountsData);
      setProfile(profileData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load your accounts. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cardsData = useMemo<DisplayCard[]>(
    () =>
      accounts.map((account, index) => ({
        id: account.id,
        type: account.accountName || "Bank account",

        // Preserve the original fields for your existing detail route.
        number: account.accountNumber || "",
        displayNumber: maskAccountNumber(
          account.accountNumber || ""
        ),
        status:
          account.status === "Active" ? "ACTIVE" : "INACTIVE",
        gradient:
          CARD_GRADIENTS[index % CARD_GRADIENTS.length],

        bank: "CAPITEC",
        holder:
          profile?.fullName?.toUpperCase() || "ACCOUNT HOLDER",
        accountNumber: account.accountNumber || "",
        accountType: "BANK ACCOUNT",

        // Account data does not provide physical-card details.
        expiry: "—",
        cvv: "***",
      })),
    [accounts, profile]
  );

  const handleCardPress = (card: DisplayCard) => {
    router.push({
      pathname: "/(tabs)/card-detail",
      params: { card: JSON.stringify(card) },
    });
  };

  const handleAddCard = () => {
    Alert.alert(
      "Coming Soon",
      "Add Entrepreneur Card feature will be available soon."
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

          <Text style={styles.appBarTitle}>Cards</Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            YOUR ACCOUNTS
          </Text>

          <Text style={styles.headerHeading}>
            My cards
          </Text>

          <Text style={styles.headerDescription}>
            View and manage your account cards in one place.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="card-outline"
              size={16}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            {loading
              ? "Loading accounts"
              : `${cardsData.length} ${
                  cardsData.length === 1 ? "account" : "accounts"
                }`}
          </Text>
        </View>
      </View>

      {/* MAIN CONTENT */}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator
            color={colors.primary}
            size="small"
          />

          <Text style={styles.stateDescription}>
            Loading your cards…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={27}
              color={colors.textSub}
            />
          </View>

          <Text style={styles.stateTitle}>
            Couldn't load your cards
          </Text>

          <Text style={styles.stateDescription}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadData}
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION HEADING */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionTitle}>
                Your cards
              </Text>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {cardsData.length}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionDescription}>
              Select an account to view its details.
            </Text>
          </View>

          {/* ACCOUNT CARDS */}

          {cardsData.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name="card-outline"
                  size={27}
                  color={colors.textSub}
                />
              </View>

              <Text style={styles.stateTitle}>
                No accounts to display
              </Text>

              <Text style={styles.stateDescription}>
                Your account cards will appear here when
                account data is available.
              </Text>
            </View>
          ) : (
            cardsData.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.cardWrapper}
                activeOpacity={0.85}
                onPress={() => handleCardPress(card)}
                accessibilityRole="button"
                accessibilityLabel={`View ${card.type} details`}
              >
                <LinearGradient
                  colors={card.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.card}
                >
                  {/* SUBTLE CARD DECORATION */}

                  <View
                    style={styles.decorativeCircleLarge}
                    pointerEvents="none"
                  />

                  <View
                    style={styles.decorativeCircleSmall}
                    pointerEvents="none"
                  />

                  {/* TOP ROW */}

                  <View style={styles.cardTopRow}>
                    <View style={styles.cardBrandGroup}>
                      <View style={styles.cardBrandIcon}>
                        <Ionicons
                          name="wallet-outline"
                          size={17}
                          color={colors.white}
                        />
                      </View>

                      <Text style={styles.cardBank}>
                        {card.bank}
                      </Text>
                    </View>

                    <View style={styles.statusBadge}>
                      <View
                        style={[
                          styles.statusDot,
                          card.status !== "ACTIVE" &&
                            styles.inactiveDot,
                        ]}
                      />

                      <Text style={styles.statusText}>
                        {card.status}
                      </Text>
                    </View>
                  </View>

                  {/* ACCOUNT TYPE */}

                  <Text
                    style={styles.cardType}
                    numberOfLines={1}
                  >
                    {card.type}
                  </Text>

                  {/* MASKED ACCOUNT NUMBER */}

                  <View style={styles.numberSection}>
                    <Text style={styles.numberLabel}>
                      ACCOUNT NUMBER
                    </Text>

                    <Text
                      style={styles.cardNumber}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {card.displayNumber}
                    </Text>
                  </View>

                  {/* BOTTOM ROW */}

                  <View style={styles.cardFooter}>
                    <View style={styles.holderGroup}>
                      <Text style={styles.footerLabel}>
                        ACCOUNT HOLDER
                      </Text>

                      <Text
                        style={styles.cardHolder}
                        numberOfLines={1}
                      >
                        {card.holder}
                      </Text>
                    </View>

                    <View style={styles.cardArrow}>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={colors.white}
                      />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}

          {/* ADD CARD */}

          <TouchableOpacity
            style={styles.addCardButton}
            onPress={handleAddCard}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add Entrepreneur Card. Coming soon."
          >
            <View style={styles.addCardIcon}>
              <Ionicons
                name="add"
                size={21}
                color={colors.primaryDark}
              />
            </View>

            <View style={styles.addCardInfo}>
              <Text style={styles.addCardTitle}>
                Add Entrepreneur Card
              </Text>

              <Text style={styles.addCardDescription}>
                Available in a future update
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.textSub}
            />
          </TouchableOpacity>

          {/* ACCOUNT INFORMATION */}

          <View style={styles.infoSection}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={colors.primaryDark}
            />

            <Text style={styles.infoText}>
              These tiles represent your bank accounts.
              Physical card details are not available
              from the current account data.
            </Text>
          </View>
        </ScrollView>
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

  headerDivider: {
    display: "none",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
    marginHorizontal: 24,
  },

  headerFooter: {
    display: "none",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },

  headerFooterIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerFooterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E4E1FF",
  },

  // CONTENT

  scrollView: {
    flex: 1,
    backgroundColor: colors.white,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  sectionHeader: {
    marginBottom: 20,
  },

  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  countBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },

  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSub,
    fontVariant: ["tabular-nums"],
  },

  sectionDescription: {
    fontSize: 13,
    color: colors.textSub,
    marginTop: 5,
    lineHeight: 19,
  },

  // ACCOUNT CARDS

  cardWrapper: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    elevation: 3,
    shadowColor: "#241D52",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },

  card: {
    minHeight: 206,
    padding: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(37,20,95,0.96)",
  },

  decorativeCircleLarge: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    top: -105,
    right: -75,
  },

  decorativeCircleSmall: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    bottom: -105,
    left: -35,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  cardBrandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cardBrandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardBank: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 1.1,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#B8F5D0",
  },

  inactiveDot: {
    backgroundColor: "#FFD5D5",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },

  cardType: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.80)",
    marginTop: 10,
  },

  numberSection: {
    marginTop: 19,
    marginBottom: 22,
  },

  numberLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 7,
  },

  cardNumber: {
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  holderGroup: {
    flex: 1,
    minWidth: 0,
  },

  footerLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 5,
  },

  cardHolder: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.4,
  },

  cardArrow: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ADD CARD

  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 75,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: 14,
    backgroundColor: colors.white,
    marginTop: 4,
    gap: 12,
  },

  addCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },

  addCardInfo: {
    flex: 1,
  },

  addCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  addCardDescription: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 4,
  },

  // INFO NOTE

  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: colors.greyLine,
    paddingTop: 18,
    marginTop: 24,
    gap: 8,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
  },

  // LOADING / ERROR / EMPTY

  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 13,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },

  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  stateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
    marginBottom: 5,
  },

  stateDescription: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 19,
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    minHeight: 44,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },

  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});