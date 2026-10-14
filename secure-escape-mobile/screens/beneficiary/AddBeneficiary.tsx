import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, sizing } from "@/utils/theme";
import { useRouter, Href } from "expo-router";

// ─────────────────────────────────────────────
// BENEFICIARY OPTIONS
// ─────────────────────────────────────────────

type BeneficiaryOption = {
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: "navigate" | "alert";
  route?: Href;
  message?: string;
};

const OPTIONS: BeneficiaryOption[] = [
  {
    title: "Capitec cellphone",
    desc: "Pay a Capitec client using their cellphone number.",
    icon: "phone-portrait-outline",
    action: "navigate",
    route: "/beneficiaries/add-beneficiary-form",
  },
  {
    title: "Bank account",
    desc: "Add a beneficiary using their bank account details.",
    icon: "business-outline",
    action: "navigate",
    route: "/beneficiaries/create-beneficiary",
  },
  {
    title: "Capitec registered",
    desc: "Pay registered businesses and service providers.",
    icon: "receipt-outline",
    action: "alert",
    message:
      "Capitec Registered payments will be available in the next sprint.",
  },
];

// ─────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────

export default function AddBeneficiaryOptions() {
  const router = useRouter();

  const handlePress = (option: BeneficiaryOption) => {
    if (option.action === "navigate" && option.route) {
      router.push(option.route);
    } else if (option.action === "alert" && option.message) {
      Alert.alert("Coming Soon", option.message);
    }
  };

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
            Add beneficiary
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        {/* HEADER CONTENT */}

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            PAYMENT METHODS
          </Text>

          <Text style={styles.headerHeading}>
            How would you like to pay?
          </Text>

          <Text style={styles.headerDescription}>
            Choose how you want to add your new beneficiary.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="person-add-outline"
              size={16}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            Add a new payment recipient
          </Text>
        </View>
      </View>

      {/* ─────────────────────────────
          MAIN CONTENT
      ───────────────────────────── */}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION HEADING */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Select a payment method
          </Text>

          <Text style={styles.sectionDescription}>
            How would you like to add your beneficiary?
          </Text>
        </View>

        {/* PAYMENT OPTIONS */}

        <View style={styles.optionsList}>
          {OPTIONS.map((option, index) => {
            const isComingSoon =
              option.action === "alert";

            return (
              <TouchableOpacity
                key={option.title}
                style={[
                  styles.optionRow,
                  index === OPTIONS.length - 1 &&
                    styles.lastOptionRow,
                ]}
                activeOpacity={0.7}
                onPress={() => handlePress(option)}
                accessibilityRole="button"
                accessibilityLabel={`${option.title}. ${option.desc}${
                  isComingSoon
                    ? " Coming soon."
                    : ""
                }`}
              >
                {/* OPTION ICON */}

                <View style={styles.iconContainer}>
                  <Ionicons
                    name={option.icon}
                    size={23}
                    color={colors.primaryDark}
                  />
                </View>

                {/* OPTION DETAILS */}

                <View style={styles.optionInfo}>
                  <View style={styles.optionTitleRow}>
                    <Text
                      style={styles.optionTitle}
                      numberOfLines={2}
                    >
                      {option.title}
                    </Text>

                    {isComingSoon && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>
                          SOON
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.optionDescription}>
                    {option.desc}
                  </Text>
                </View>

                {/* NAVIGATION INDICATOR */}

                <View style={styles.optionChevron}>
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={colors.textSub}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SUPPORTING INFORMATION */}

        <View style={styles.infoSection}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primaryDark}
            />
          </View>

          <Text style={styles.infoText}>
            You'll need the recipient's correct payment
            details to add them as a beneficiary.
          </Text>
        </View>
      </ScrollView>
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

  scrollContent: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },

  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
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

  // ─────────────────────────
  // PAYMENT OPTIONS
  // ─────────────────────────

  optionsList: {
    borderTopWidth: 1,
    borderTopColor: colors.greyLine,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLine,
  },

  lastOptionRow: {
    borderBottomWidth: 1,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },

  optionInfo: {
    flex: 1,
    minWidth: 0,
  },

  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
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

  optionChevron: {
    width: 24,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },

  // ─────────────────────────
  // COMING SOON BADGE
  // ─────────────────────────

  comingSoonBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  comingSoonText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.4,
  },

  // ─────────────────────────
  // INFORMATION SECTION
  // ─────────────────────────

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

  infoIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
  },
});
