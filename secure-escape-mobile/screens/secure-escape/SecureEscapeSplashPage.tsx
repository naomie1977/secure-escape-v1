import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { colors } from "@/utils/theme";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#F8F8FB";
const LINE = "#E9E8F0";
const PALE_PURPLE = "#F3F0FF";
const TEXT_MUTED = "#777684";

export default function SecureEscapeSplashPage() {
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(18)).current;

  const modalFadeAnim = useRef(
    new Animated.Value(0)
  ).current;

  const modalTranslateAnim = useRef(
    new Animated.Value(28)
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),

      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  const handleContinue = () => {
    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    );

    router.push("/secure-escape/mode-selection");
  };

  const openModal = () => {
    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    );

    setModalVisible(true);

    modalFadeAnim.setValue(0);
    modalTranslateAnim.setValue(28);

    Animated.parallel([
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),

      Animated.timing(modalTranslateAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalFadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),

      Animated.timing(modalTranslateAnim, {
        toValue: 28,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      {/* TOP BAR */}

      <View style={styles.topBar}>
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
            color={colors.navy}
          />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>
          Secure Escape
        </Text>

        <View style={styles.topBarSpacer} />
      </View>

      {/* MAIN CONTENT */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO VISUAL */}

        <Animated.View
          style={[
            styles.heroVisual,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: translateAnim,
                },
              ],
            },
          ]}
        >
          <View style={styles.visualOuter}>
            <View style={styles.visualMiddle}>
              <View style={styles.visualInner}>
                <Ionicons
                  name="shield-checkmark"
                  size={54}
                  color={PURPLE}
                />
              </View>
            </View>
          </View>

          <View style={styles.privateBadge}>
            <Ionicons
              name="lock-closed-outline"
              size={13}
              color={PURPLE}
            />

            <Text style={styles.privateBadgeText}>
              PRIVATE SAFETY FEATURE
            </Text>
          </View>
        </Animated.View>

        {/* INTRO */}

        <Animated.View
          style={[
            styles.intro,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: translateAnim,
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>
            Bank differently when your safety is at risk
          </Text>

          <Text style={styles.description}>
            Secure Escape lets you prepare a separate
            banking experience for situations where you
            may be forced to transact under threat.
          </Text>
        </Animated.View>

        {/* LEARN MORE */}

        <TouchableOpacity
          style={styles.learnMore}
          onPress={openModal}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Learn how Secure Escape works"
        >
          <Text style={styles.learnMoreText}>
            Learn how Secure Escape works
          </Text>

          <Ionicons
            name="arrow-forward"
            size={16}
            color={PURPLE}
          />
        </TouchableOpacity>

        {/* BENEFITS CARD */}

        <View style={styles.benefitsCard}>
          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Ionicons
                name="key-outline"
                size={19}
                color={PURPLE}
              />
            </View>

            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>
                Separate duress PIN
              </Text>

              <Text style={styles.benefitText}>
                A different PIN can open your configured
                Secure Escape banking view.
              </Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Ionicons
                name="wallet-outline"
                size={19}
                color={PURPLE}
              />
            </View>

            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>
                Controlled visible balance
              </Text>

              <Text style={styles.benefitText}>
                Your Secure Escape profile can display a
                configured amount instead of exposing your
                full available balance.
              </Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Ionicons
                name="shield-outline"
                size={19}
                color={PURPLE}
              />
            </View>

            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>
                Designed to stay discreet
              </Text>

              <Text style={styles.benefitText}>
                Secure Escape is designed so the banking
                experience does not obviously reveal that
                safety mode is active.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FIXED BOTTOM CTA */}

      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Set up Secure Escape"
        >
          <Text style={styles.continueButtonText}>
            Set up Secure Escape
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color={WHITE}
          />
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          You can review everything before activation.
        </Text>
      </View>

      {/* LEARN MORE MODAL */}

      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback
            onPress={closeModal}
          >
            <Animated.View
              style={[
                styles.modalBackdrop,
                {
                  opacity: modalFadeAnim,
                },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.modalSheet,
              {
                transform: [
                  {
                    translateY:
                      modalTranslateAnim,
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={PURPLE}
                />
              </View>

              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>
                  SECURE ESCAPE
                </Text>

                <Text style={styles.modalTitle}>
                  How the safety flow works
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={closeModal}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.navy}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.modalScrollContent
              }
            >
              <Text style={styles.modalIntro}>
                Secure Escape is designed to provide a
                believable banking experience if you are
                forced to use the app under threat.
              </Text>

              <View style={styles.modalFeature}>
                <View style={styles.modalNumber}>
                  <Text style={styles.modalNumberText}>
                    1
                  </Text>
                </View>

                <View style={styles.modalFeatureCopy}>
                  <Text style={styles.modalFeatureTitle}>
                    Enter your duress PIN
                  </Text>

                  <Text
                    style={
                      styles.modalFeatureDescription
                    }
                  >
                    The app can open your configured
                    Secure Escape view instead of your
                    normal banking session.
                  </Text>
                </View>
              </View>

              <View style={styles.modalFeature}>
                <View style={styles.modalNumber}>
                  <Text style={styles.modalNumberText}>
                    2
                  </Text>
                </View>

                <View style={styles.modalFeatureCopy}>
                  <Text style={styles.modalFeatureTitle}>
                    A configured balance is shown
                  </Text>

                  <Text
                    style={
                      styles.modalFeatureDescription
                    }
                  >
                    The amount visible in Secure Escape
                    mode is based on the safety profile
                    you set up beforehand.
                  </Text>
                </View>
              </View>

              <View style={styles.modalFeature}>
                <View style={styles.modalNumber}>
                  <Text style={styles.modalNumberText}>
                    3
                  </Text>
                </View>

                <View style={styles.modalFeatureCopy}>
                  <Text style={styles.modalFeatureTitle}>
                    Payments use a normal-looking flow
                  </Text>

                  <Text
                    style={
                      styles.modalFeatureDescription
                    }
                  >
                    The experience is designed to avoid
                    making it obvious that Secure Escape
                    mode has been triggered.
                  </Text>
                </View>
              </View>

              <View style={styles.modalNotice}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={PURPLE}
                />

                <Text style={styles.modalNoticeText}>
                  Secure Escape is intended to support
                  personal safety. The exact response
                  depends on the features configured in
                  your Secure Escape profile.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>
                  Got it
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // TOP BAR

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 24) + 8
        : 56,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: WHITE,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },

  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },

  topBarSpacer: {
    width: 44,
  },

  // MAIN SCROLL

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },

  // HERO

  heroVisual: {
    alignItems: "center",
    paddingTop: 2,
    marginBottom: 14,
  },

  visualOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "#FAF9FF",
    alignItems: "center",
    justifyContent: "center",
  },

  visualMiddle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  visualInner: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: PURPLE,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,

    elevation: 4,
  },

  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALE_PURPLE,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    gap: 5,
  },

  privateBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: PURPLE,
    letterSpacing: 0.7,
  },

  // INTRO

  intro: {
    alignItems: "center",
    paddingHorizontal: 6,
    marginBottom: 10,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.navy,
    lineHeight: 31,
    letterSpacing: -0.6,
    textAlign: "center",
    maxWidth: 340,
  },

  description: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 330,
  },

  // LEARN MORE

  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
    gap: 7,
  },

  learnMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE,
  },

  // BENEFITS

  benefitsCard: {
    marginTop: 35,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 18,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    gap: 12,
  },

  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  benefitCopy: {
    flex: 1,
  },

  benefitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  benefitText: {
    fontSize: 11,
    color: colors.textSub,
    lineHeight: 16,
    marginTop: 3,
  },

  rowDivider: {
    height: 1,
    backgroundColor: LINE,
    marginLeft: 50,
  },

  // BOTTOM CTA

  bottomArea: {
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom:
      Platform.OS === "ios" ? 24 : 14,
  },

  continueButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: PURPLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  continueButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
  },

  bottomNote: {
    fontSize: 10,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 6,
  },

  // MODAL — UNCHANGED

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor:
      "rgba(15,23,42,0.55)",
  },

  modalSheet: {
    maxHeight: "82%",
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },

  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: LINE,
    alignSelf: "center",
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },

  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  modalHeaderCopy: {
    flex: 1,
  },

  modalEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSub,
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.navy,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },

  modalIntro: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 22,
  },

  modalFeature: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },

  modalNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  modalNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: PURPLE,
  },

  modalFeatureCopy: {
    flex: 1,
  },

  modalFeatureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },

  modalFeatureDescription: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 18,
    marginTop: 4,
  },

  modalNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_PURPLE,
    borderRadius: 14,
    padding: 14,
    gap: 9,
    marginTop: 4,
  },

  modalNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSub,
    lineHeight: 17,
  },

  modalButton: {
    minHeight: 48,
    backgroundColor: PURPLE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },

  modalButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: WHITE,
  },
});