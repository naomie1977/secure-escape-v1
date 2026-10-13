
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

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const LINE = "#E9E8F0";
const PALE_PURPLE = "#F3F0FF";

const TIPS = [
  {
    icon: "lock-closed-outline" as const,
    number: "01",
    title: "Never share your PIN",
    body:
      "Not with family, bank staff, or anyone claiming to be support. Your bank will not ask you to reveal your PIN over a call, message, or email.",
  },
  {
    icon: "eye-off-outline" as const,
    number: "02",
    title: "Cover the keypad",
    body:
      "When entering your PIN at an ATM or in person, shield the keypad with your hand — even if you don't think anyone is watching.",
  },
  {
    icon: "alert-circle-outline" as const,
    number: "03",
    title: "Be wary of urgency",
    body:
      "Scammers create pressure to make you act before you think. If a message or call insists you act immediately, verify it through a separate, trusted channel first.",
  },
  {
    icon: "phone-portrait-outline" as const,
    number: "04",
    title: "Verify unexpected requests",
    body:
      "If someone unexpectedly asks you to send money or share account details, contact them directly through a number you already know — not one they have just given you.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    number: "05",
    title: "Understand your Secure Escape PIN",
    body:
      "If your Secure Escape duress PIN is available in your account, learn how it works before you need it. Its response depends on which safety features are enabled and connected.",
  },
];

export default function SecurityTips() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
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
              color={WHITE}
            />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>
            Security tips
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            STAY PROTECTED
          </Text>

          <Text style={styles.headerHeading}>
            Safer banking starts here
          </Text>

          <Text style={styles.headerDescription}>
            Everyday habits to help protect your
            money, account and personal information.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            5 banking security tips
          </Text>
        </View>
      </View>

      {/* MAIN CONTENT */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Text style={styles.sectionTitle}>
            Protect your account
          </Text>

          <Text style={styles.sectionDescription}>
            Small precautions can help you spot suspicious
            activity and avoid common scams.
          </Text>
        </View>

        {/* TIP CARDS */}

        <View style={styles.tipsList}>
          {TIPS.map((tip) => (
            <View
              key={tip.number}
              style={styles.tipCard}
            >
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
              name="shield-outline"
              size={20}
              color={PURPLE}
            />
          </View>

          <View style={styles.closingTextGroup}>
            <Text style={styles.closingTitle}>
              If something feels suspicious
            </Text>

            <Text style={styles.closingBody}>
              Stop the transaction if it is safe to do so,
              and contact your bank through its official
              app or a trusted contact number.
            </Text>
          </View>
        </View>

        {/* IMPORTANT SAFETY NOTE */}

        <View style={styles.disclaimer}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textSub}
          />

          <Text style={styles.disclaimerText}>
            Security features cannot guarantee your
            safety in every situation. If you are under
            an immediate physical threat, prioritise
            your safety and seek emergency assistance
            when it is safe to do so.
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

  // SAFETY NOTE

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