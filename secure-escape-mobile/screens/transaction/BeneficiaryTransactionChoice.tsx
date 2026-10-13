
import React from "react";
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
import { colors, radii, sizing, spacing } from "@/utils/theme";

export default function BeneficiaryTransactionChoice() {
  const router = useRouter();

  const {
    beneficiaryId,
    beneficiaryName,
    reference,
  } = useLocalSearchParams<{
    beneficiaryId?: string;
    beneficiaryName?: string;
    reference?: string;
  }>();

  const transferParams = {
    beneficiaryId: beneficiaryId ?? "",
    beneficiaryName: beneficiaryName ?? "",
    reference: reference ?? "",
  };

  const displayName = beneficiaryName?.trim() ?? "";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?";

  const handleBankTransfer = () => {
    router.push({
      pathname: "/transactions/create-transfer",
      params: transferParams,
    });
  };

  const handleCashSend = () => {
    router.push({
      pathname: "/transactions/create-cash-send",
      params: {
        reference: reference ?? "",
      },
    });
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
            Choose payment
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            SEND MONEY
          </Text>

          <Text style={styles.headerHeading}>
            How would you like to pay?
          </Text>

          <Text style={styles.headerDescription}>
            Choose the payment method that works for you.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="swap-horizontal-outline"
              size={16}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            Select a payment method
          </Text>
        </View>
      </View>

      {/* MAIN CONTENT */}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SELECTED RECIPIENT */}

        {!!displayName && (
          <View style={styles.recipientSection}>
            <Text style={styles.sectionEyebrow}>
              SELECTED RECIPIENT
            </Text>

            <View style={styles.recipientCard}>
              <View style={styles.recipientTop}>
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientInitials}>
                    {initials}
                  </Text>
                </View>

                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientLabel}>
                    Paying
                  </Text>

                  <Text
                    style={styles.recipientName}
                    numberOfLines={2}
                  >
                    {displayName}
                  </Text>
                </View>

                <Ionicons
                  name="person-outline"
                  size={19}
                  color={colors.textSub}
                />
              </View>

              {!!reference && (
                <>
                  <View style={styles.recipientDivider} />

                  <View style={styles.referenceRow}>
                    <Text style={styles.referenceLabel}>
                      Beneficiary reference
                    </Text>

                    <Text
                      style={styles.referenceValue}
                      numberOfLines={2}
                    >
                      {reference}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* PAYMENT METHODS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Payment methods
          </Text>

          <Text style={styles.sectionDescription}>
            Select how you want to send your money.
          </Text>
        </View>

        <View style={styles.optionsList}>
          {/* BANK TRANSFER */}

          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={handleBankTransfer}
            accessibilityRole="button"
            accessibilityLabel="Bank transfer. Send money to this beneficiary."
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="swap-horizontal-outline"
                size={23}
                color={colors.primaryDark}
              />
            </View>

            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>
                Bank transfer
              </Text>

              <Text style={styles.optionDescription}>
                Send money to this beneficiary.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.textSub}
            />
          </TouchableOpacity>

          {/* CASH SEND */}

          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={handleCashSend}
            accessibilityRole="button"
            accessibilityLabel="Cash send. Create a cash voucher and PIN."
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="cash-outline"
                size={23}
                color={colors.primaryDark}
              />
            </View>

            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>
                Cash send
              </Text>

              <Text style={styles.optionDescription}>
                Create a cash voucher with a four-digit PIN.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.textSub}
            />
          </TouchableOpacity>
        </View>

        {/* SUPPORTING NOTE */}

        <View style={styles.infoSection}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={colors.primaryDark}
          />

          <Text style={styles.infoText}>
            Review the payment details carefully before
            confirming a transaction.
          </Text>
        </View>
      </ScrollView>
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

  // MAIN CONTENT

  content: {
    flex: 1,
    backgroundColor: colors.white,
  },

  scrollContent: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },

  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    fontSize: 20,
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

  // SELECTED RECIPIENT

  recipientSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
  },

  recipientCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: radii.md,
    padding: spacing.lg,
  },

  recipientTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  recipientAvatar: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },

  recipientInitials: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
  },

  recipientInfo: {
    flex: 1,
    minWidth: 0,
  },

  recipientLabel: {
    fontSize: 11,
    color: colors.textSub,
    marginBottom: 4,
  },

  recipientName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
  },

  recipientDivider: {
    height: 1,
    backgroundColor: colors.greyLine,
    marginVertical: spacing.lg,
  },

  referenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  referenceLabel: {
    fontSize: 12,
    color: colors.textSub,
  },

  referenceValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "right",
  },

  // PAYMENT OPTIONS

  optionsList: {
    borderTopWidth: 1,
    borderTopColor: colors.greyLine,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
    backgroundColor: colors.white,
    gap: spacing.md,
  },

  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },

  optionInfo: {
    flex: 1,
    minWidth: 0,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },

  optionDescription: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 5,
    lineHeight: 18,
  },

  // INFORMATION NOTE

  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.greyLine,
    gap: spacing.sm,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
  },
});