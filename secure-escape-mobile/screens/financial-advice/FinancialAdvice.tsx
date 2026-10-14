
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
import { useRouter } from "expo-router";
import { colors } from "@/utils/theme";

// Local layout values keep this screen independent of
// any spacing/radii exports in your theme file.
const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const LINE = "#E9E8F0";
const PALE_PURPLE = "#F3F0FF";

const TIPS = [
  {
    icon: "wallet-outline" as const,
    number: "01",
    title: "Pay yourself first",
    body:
      "Before spending on anything else, move a small amount into savings the moment you get paid. Even a fixed R100 a month adds up faster than waiting for 'leftover' money.",
  },
  {
    icon: "repeat-outline" as const,
    number: "02",
    title: "Automate what you can",
    body:
      "Set up automatic transfers for savings, debt payments, or recurring bills. Decisions you don't have to make every month are decisions you can't forget or talk yourself out of.",
  },
  {
    icon: "list-outline" as const,
    number: "03",
    title: "Track before you cut",
    body:
      "Before trying to spend less, just look at where money actually goes for a month. Most people are surprised by one or two categories — that's usually the easiest place to start.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    number: "04",
    title: "Build a small buffer first",
    body:
      "A small emergency fund — even a few hundred rand — means one unexpected expense doesn't have to become debt. Build this before tackling bigger financial goals.",
  },
  {
    icon: "trending-up-outline" as const,
    number: "05",
    title: "Small habits compound",
    body:
      "Consistency beats intensity. Saving a manageable amount regularly can help you build progress over time.",
  },
];

export default function FinancialAdvice() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
      />

      {/* HEADER */}

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
              color={WHITE}
            />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>
            Financial tips
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            MONEY MATTERS
          </Text>

          <Text style={styles.headerHeading}>
            Build better money habits
          </Text>

          <Text style={styles.headerDescription}>
            Simple ideas to help you feel more
            intentional about your finances.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="bulb-outline"
              size={17}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            5 everyday money tips
          </Text>
        </View>
      </View>

      {/* CONTENT */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Text style={styles.sectionTitle}>
            Start with the basics
          </Text>

          <Text style={styles.sectionDescription}>
            You don't need to change everything at once.
            Pick one habit that fits your situation and
            build from there.
          </Text>
        </View>

        {/* TIPS */}

        <View style={styles.tipsList}>
          {TIPS.map((tip) => (
            <View key={tip.number} style={styles.tipCard}>
              <View style={styles.tipTopRow}>
                <View style={styles.tipIcon}>
                  <Ionicons
                    name={tip.icon}
                    size={21}
                    color={PURPLE}
                  />
                </View>

                <Text style={styles.tipNumber}>
                  TIP {tip.number}
                </Text>
              </View>

              <Text style={styles.tipTitle}>
                {tip.title}
              </Text>

              <Text style={styles.tipBody}>
                {tip.body}
              </Text>
            </View>
          ))}
        </View>

        {/* CLOSING NOTE */}

        <View style={styles.closingCard}>
          <View style={styles.closingIcon}>
            <Ionicons
              name="sparkles-outline"
              size={20}
              color={PURPLE}
            />
          </View>

          <View style={styles.closingTextGroup}>
            <Text style={styles.closingTitle}>
              Progress looks different for everyone
            </Text>

            <Text style={styles.closingBody}>
              Start with an amount or habit you can
              realistically maintain.
            </Text>
          </View>
        </View>

        {/* DISCLAIMER */}

        <View style={styles.disclaimer}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textSub}
          />

          <Text style={styles.disclaimerText}>
            These are general tips, not personalised
            financial advice. For guidance specific
            to your situation, consider speaking to
            a qualified financial adviser.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // HEADER

  header: {
    backgroundColor: PURPLE,
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
    color: WHITE,
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
    color: WHITE,
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  headerDescription: {
    fontSize: 13,
    color: "#E4E1FF",
    marginTop: 8,
    lineHeight: 19,
    maxWidth: 310,
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
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 42,
  },

  introSection: {
    marginBottom: 22,
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
    lineHeight: 20,
    marginTop: 7,
  },

  // TIP CARDS

  tipsList: {
    gap: 12,
  },

  tipCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    padding: 18,
  },

  tipTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  tipIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  tipNumber: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.textSub,
  },

  tipTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.2,
    marginBottom: 8,
  },

  tipBody: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 20,
  },

  // CLOSING NOTE

  closingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_PURPLE,
    borderRadius: 15,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },

  closingIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  closingTextGroup: {
    flex: 1,
  },

  closingTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
    lineHeight: 19,
  },

  closingBody: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 19,
    marginTop: 5,
  },

  // DISCLAIMER

  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 18,
    marginTop: 24,
    gap: 9,
  },

  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSub,
    lineHeight: 18,
  },
});