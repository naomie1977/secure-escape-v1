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

export default function TransactionChoice() {
  const router = useRouter();

  const { beneficiaryId, beneficiaryName, reference } = useLocalSearchParams<{
    beneficiaryId?: string;
    beneficiaryName?: string;
    reference?: string;
  }>();

  const hasBeneficiary = !!beneficiaryId;
  const displayName = beneficiaryName?.trim() ?? "";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?";

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#25145F"
      />

      {/* DEEP-PURPLE HEADER */}
      <View style={styles.header}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>Choose payment</Text>
          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>SEND MONEY</Text>
          <Text style={styles.headerHeading}>How would you like to pay?</Text>
          <Text style={styles.headerDescription}>
            Choose the payment method that works for you.
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
        {(hasBeneficiary || !!displayName) && (
          <View style={styles.recipientSection}>
            <Text style={styles.sectionEyebrow}>SELECTED RECIPIENT</Text>

            <View style={styles.recipientCard}>
              <View style={styles.recipientTop}>
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientInitials}>{initials}</Text>
                </View>

                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientLabel}>Paying</Text>
                  <Text style={styles.recipientName} numberOfLines={2}>
                    {displayName || "Beneficiary"}
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
                    <Text style={styles.referenceValue} numberOfLines={2}>
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
          <Text style={styles.sectionTitle}>Payment methods</Text>
          <Text style={styles.sectionDescription}>
            Select how you want to send your money.
          </Text>
        </View>

        <View style={styles.optionsList}>
          {/* BANK TRANSFER */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => {
              if (hasBeneficiary) {
                router.push({
                  pathname: "/transactions/create-transfer",
                  params: {
                    beneficiaryId,
                    beneficiaryName: beneficiaryName ?? "",
                    reference: reference ?? "",
                  },
                });
                return;
              }

              router.push("/transactions/once-off-transfer");
            }}
            accessibilityRole="button"
            accessibilityLabel="Bank transfer. Send money to a beneficiary or once-off recipient."
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="swap-horizontal-outline"
                size={23}
                color="#25145F"
              />
            </View>

            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Bank transfer</Text>
              <Text style={styles.optionDescription}>
                {hasBeneficiary
                  ? "Send money to this beneficiary."
                  : "Send money to a once-off recipient."}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#94A3B8"
            />
          </TouchableOpacity>

          {/* CASH SEND */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/transactions/create-cash-send",
                params: {
                  reference: reference ?? "",
                },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Cash send. Create a cash voucher and PIN."
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="cash-outline"
                size={23}
                color="#25145F"
              />
            </View>

            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Cash send</Text>
              <Text style={styles.optionDescription}>
                Create a cash voucher with a four-digit PIN.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#94A3B8"
            />
          </TouchableOpacity>
        </View>

        {/* SUPPORTING NOTE */}
        <View style={styles.infoSection}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color="#25145F"
          />
          <Text style={styles.infoText}>
            Review the payment details carefully before confirming a
            transaction.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#25145F",
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
    color: "#FFFFFF",
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
    color: "#E9D5FF",
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
  },
  headerHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  headerDescription: {
    fontSize: 13,
    color: "#E9D5FF",
    marginTop: spacing.xs,
    lineHeight: 18,
    maxWidth: 320,
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 18,
  },
  recipientSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  recipientCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
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
    borderRadius: 22,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  recipientInitials: {
    fontSize: 15,
    fontWeight: "800",
    color: "#25145F",
  },
  recipientInfo: {
    flex: 1,
    minWidth: 0,
  },
  recipientLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 2,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  recipientDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: spacing.md,
  },
  referenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  referenceLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  referenceValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
  },
  optionsList: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: spacing.md,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
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
    color: "#0F172A",
  },
  optionDescription: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 17,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
});