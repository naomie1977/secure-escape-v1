
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/utils/theme";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const BACKGROUND = "#F7F6FB";
const LINE = "#E8E6F0";
const PALE_PURPLE = "#EFEBFC";
const MUTED_PURPLE = "#DCD5F5";
const GREEN = "#178456";
const PALE_GREEN = "#EAF7F0";

export default function Congrats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const compact = height < 740;

  const entrance = useRef(
    new Animated.Value(0)
  ).current;

  const checkScale = useRef(
    new Animated.Value(0.88)
  ).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),

      Animated.spring(checkScale, {
        toValue: 1,
        friction: 7,
        tension: 85,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});

    return () => {
      animation.stop();
    };
  }, [entrance, checkScale]);

  const handleGoHome = () => {
    void Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});

    router.replace("/(tabs)");
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
      />

      {/* COMPLETED ONBOARDING HEADER */}

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 4,
          },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />

          <Text style={styles.topBarTitle}>
            Secure Escape
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <View
          style={[
            styles.headerContent,
            compact && styles.headerContentCompact,
          ]}
        >
          <View style={styles.stepRow}>
            <View style={styles.stepPill}>
              <Ionicons
                name="checkmark"
                size={12}
                color={WHITE}
              />

              <Text style={styles.stepPillText}>
                SETUP COMPLETE
              </Text>
            </View>
          </View>

          <Text style={styles.headerTitle}>
            Protection active
          </Text>

          <Text style={styles.headerDescription}>
            Your Secure Escape setup is complete.
          </Text>
        </View>
      </View>

      {/* MAIN CONTENT */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          compact && styles.scrollContentCompact,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.successSection,
            {
              opacity: entrance,
              transform: [
                {
                  translateY:
                    entrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                },
              ],
            },
          ]}
        >
          {/* SUCCESS SYMBOL */}

          <Animated.View
            style={[
              styles.successIconOuter,
              compact && styles.successIconOuterCompact,
              {
                transform: [
                  { scale: checkScale },
                ],
              },
            ]}
          >
            <View style={styles.successIconInner}>
              <Ionicons
                name="shield-checkmark"
                size={compact ? 37 : 43}
                color={PURPLE}
              />
            </View>

            <View style={styles.successCheck}>
              <Ionicons
                name="checkmark"
                size={17}
                color={WHITE}
              />
            </View>
          </Animated.View>

          <Text style={styles.successTitle}>
            You&apos;re Protected
          </Text>

          <Text style={styles.greeting}>
            Congratulations!
          </Text>

          <Text style={styles.message}>
            Your Silent Lifeline is ready – and
            it&apos;s completely invisible to
            everyone but you.
          </Text>

          {/* GUARANTEE BADGE */}

          <View style={styles.guaranteeBadge}>
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={GREEN}
            />

            <Text style={styles.guaranteeText}>
              Bank-guaranteed protection
            </Text>
          </View>
        </Animated.View>

        {/* USEFUL NEXT STEPS */}

        <View
          style={[
            styles.tipsCard,
            compact && styles.tipsCardCompact,
          ]}
        >
          <View style={styles.tipsHeading}>
            <View style={styles.tipsHeadingIcon}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color={PURPLE}
              />
            </View>

            <Text style={styles.tipsTitle}>
              Remember
            </Text>
          </View>

          <View style={styles.tipRow}>
            <View style={styles.tipIcon}>
              <Ionicons
                name="key-outline"
                size={18}
                color={PURPLE}
              />
            </View>

            <Text style={styles.tipText}>
              If you&apos;re ever forced to
              transact, stay calm. Enter your
              duress PIN and let the system work.
            </Text>
          </View>

          <View style={styles.tipDivider} />

          <View style={styles.tipRow}>
            <View style={styles.tipIcon}>
              <Ionicons
                name="shield-outline"
                size={18}
                color={PURPLE}
              />
            </View>

            <Text style={styles.tipText}>
              After you&apos;re safe, contact
              your bank with a police case
              number to get your protection
              amount refunded.
            </Text>
          </View>
        </View>

        <View style={styles.privacyNote}>
          <Ionicons
            name="lock-closed-outline"
            size={15}
            color={colors.textSub}
          />

          <Text style={styles.privacyText}>
            Your normal banking remains unchanged.
            No one will know you&apos;re protected.
          </Text>
        </View>
      </ScrollView>

      {/* FIXED HOME ACTION */}

      <View
        style={[
          styles.bottomArea,
          {
            paddingBottom: Math.max(
              insets.bottom,
              14
            ),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.homeButton}
          onPress={handleGoHome}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <Text style={styles.homeButtonText}>
            Go to Home
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color={WHITE}
          />
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          Secure Escape setup complete
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  // HEADER

  header: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
  },

  topBar: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  topBarSpacer: {
    width: 44,
  },

  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: WHITE,
  },

  headerContent: {
    paddingHorizontal: 22,
    paddingTop: 9,
    paddingBottom: 19,
  },

  headerContentCompact: {
    paddingTop: 6,
    paddingBottom: 14,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  stepPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: WHITE,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 31,
    color: WHITE,
  },

  headerDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#E4E1FF",
    marginTop: 5,
  },

  // CONTENT

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 23,
    paddingBottom: 17,
  },

  scrollContentCompact: {
    paddingTop: 13,
    paddingBottom: 9,
  },

  // SUCCESS

  successSection: {
    alignItems: "center",
  },

  successIconOuter: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  successIconOuterCompact: {
    width: 82,
    height: 82,
    borderRadius: 41,
    marginBottom: 10,
  },

  successIconInner: {
    width: "76%",
    height: "76%",
    borderRadius: 999,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  successCheck: {
    position: "absolute",
    right: 1,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    borderWidth: 3,
    borderColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.5,
    textAlign: "center",
  },

  greeting: {
    fontSize: 14,
    fontWeight: "700",
    color: PURPLE,
    textAlign: "center",
    marginTop: 5,
  },

  message: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSub,
    textAlign: "center",
    marginTop: 9,
    maxWidth: 320,
  },

  guaranteeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALE_GREEN,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 7,
    marginTop: 15,
  },

  guaranteeText: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
  },

  // TIPS

  tipsCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },

  tipsCardCompact: {
    marginTop: 15,
    padding: 13,
  },

  tipsHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 14,
  },

  tipsHeadingIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  tipsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
  },

  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  tipText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSub,
  },

  tipDivider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 12,
    marginLeft: 41,
  },

  // PRIVACY NOTE

  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 6,
  },

  privacyText: {
    flexShrink: 1,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    color: colors.textSub,
  },

  // FIXED BOTTOM ACTION

  bottomArea: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },

  homeButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: PURPLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  homeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
  },

  bottomNote: {
    fontSize: 11,
    color: colors.textSub,
    textAlign: "center",
    marginTop: 9,
  },
});