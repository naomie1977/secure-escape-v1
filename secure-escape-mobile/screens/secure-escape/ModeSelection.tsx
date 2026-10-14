
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

type ProtectionMode = "LowProfile" | "Custom";

export default function ModeSelection() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const compact = height < 740;

  const [selectedMode, setSelectedMode] =
    useState<ProtectionMode | null>(null);

  const [modalVisible, setModalVisible] =
    useState(false);

  const handleSelect = (mode: ProtectionMode) => {
    setSelectedMode(mode);
    void Haptics.selectionAsync().catch(() => {});
  };

  const handleContinue = () => {
    if (!selectedMode) return;

    void Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});

    router.push({
      pathname: "/secure-escape/emergency-budget",
      params: {
        profileType: selectedMode,
      },
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
      />

      {/* DISTINCT ONBOARDING HEADER */}

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 4 },
        ]}
      >
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
              size={21}
              color={WHITE}
            />
          </TouchableOpacity>

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
              <Text style={styles.stepPillText}>
                STEP 01
              </Text>
            </View>

            <Text style={styles.stepCaption}>
              PROTECTION SETUP
            </Text>
          </View>

          <Text style={styles.headerTitle}>
            Choose your protection mode
          </Text>

          <Text style={styles.headerDescription}>
            Select the mode that matches your risk level.
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
        <View style={styles.sectionIntro}>
          <Text style={styles.sectionLabel}>
            AVAILABLE MODES
          </Text>

          <Text style={styles.sectionHint}>
            Choose one option to continue.
          </Text>
        </View>

        {/* LOW PROFILE */}

        <TouchableOpacity
          style={[
            styles.modeCard,
            compact && styles.modeCardCompact,
            selectedMode === "LowProfile" &&
              styles.selectedCard,
          ]}
          onPress={() => handleSelect("LowProfile")}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{
            checked: selectedMode === "LowProfile",
            selected: selectedMode === "LowProfile",
          }}
          accessibilityLabel="Low Profile Mode, Recommended"
        >
          <View style={styles.modeTopRow}>
            <View style={styles.modeIcon}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color={PURPLE}
              />
            </View>

            <View style={styles.modeTopRight}>
              <View style={styles.recommendedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={GREEN}
                />

                <Text style={styles.recommendedText}>
                  Recommended
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  selectedMode === "LowProfile" &&
                    styles.radioOuterSelected,
                ]}
              >
                {selectedMode === "LowProfile" && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </View>
          </View>

          <Text style={styles.modeTitle}>
            Low Profile Mode
          </Text>

          <Text style={styles.modeDescription}>
            Shows a near-empty account balance under
            duress. Ideal for most users.
          </Text>
        </TouchableOpacity>

        {/* REALISTIC DECOY */}

        <TouchableOpacity
          style={[
            styles.modeCard,
            compact && styles.modeCardCompact,
            selectedMode === "Custom" &&
              styles.selectedCard,
          ]}
          onPress={() => handleSelect("Custom")}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{
            checked: selectedMode === "Custom",
            selected: selectedMode === "Custom",
          }}
          accessibilityLabel="Realistic Decoy Mode"
        >
          <View style={styles.modeTopRow}>
            <View style={styles.modeIcon}>
              <Ionicons
                name="layers-outline"
                size={20}
                color={PURPLE}
              />
            </View>

            <View
              style={[
                styles.radioOuter,
                selectedMode === "Custom" &&
                  styles.radioOuterSelected,
              ]}
            >
              {selectedMode === "Custom" && (
                <View style={styles.radioInner} />
              )}
            </View>
          </View>

          <Text style={styles.modeTitle}>
            Realistic Decoy Mode
          </Text>

          <Text style={styles.modeDescription}>
            Shows a believable balance based on
            spending patterns. For higher-risk
            individuals.
          </Text>
        </TouchableOpacity>

        {/* RISK LEVEL HELP */}

        <TouchableOpacity
          style={styles.helpRow}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="I don't know my risk level"
        >
          <Ionicons
            name="help-circle-outline"
            size={19}
            color={PURPLE}
          />

          <Text style={styles.helpText}>
            I don&apos;t know my risk level
          </Text>

          <Ionicons
            name="chevron-forward"
            size={17}
            color={PURPLE}
          />
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />

        <View style={styles.privateNote}>
          <Ionicons
            name="lock-closed-outline"
            size={15}
            color={colors.textSub}
          />

          <Text style={styles.privateNoteText}>
            Your protection settings are kept private.
          </Text>
        </View>

      </ScrollView>

      {/* FIXED CONTINUE */}

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
          style={[
            styles.continueButton,
            !selectedMode && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!selectedMode}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{
            disabled: !selectedMode,
          }}
        >
          <Text style={styles.continueText}>
            Continue
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color={WHITE}
          />
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
  Next: Set your emergency budget
</Text>
      </View>

      {/* RISK LEVEL HELP SHEET */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close risk level information"
          />

          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  20
                ),
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
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
                  Understanding your risk level
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
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
              contentContainerStyle={
                styles.modalScrollContent
              }
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalIntro}>
                If you&apos;re unsure, start with{" "}
                <Text style={styles.bold}>
                  Low Profile Mode
                </Text>.
              </Text>

              <View style={styles.modalOption}>
                <View style={styles.modalOptionIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={PURPLE}
                  />
                </View>

                <View style={styles.modalOptionCopy}>
                  <Text style={styles.modalOptionTitle}>
                    Low Profile Mode
                  </Text>

                  <Text style={styles.modalOptionText}>
                    Best for most people. Shows a{" "}
                    <Text style={styles.bold}>
                      very low balance
                    </Text>{" "}
                    if forced to transact. Good for{" "}
                    <Text style={styles.bold}>
                      opportunistic crimes like
                      hijackings or express kidnappings
                    </Text>.
                  </Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalOption}>
                <View style={styles.modalOptionIcon}>
                  <Ionicons
                    name="layers-outline"
                    size={20}
                    color={PURPLE}
                  />
                </View>

                <View style={styles.modalOptionCopy}>
                  <Text style={styles.modalOptionTitle}>
                    Realistic Decoy Mode
                  </Text>

                  <Text style={styles.modalOptionText}>
                    Best if you&apos;re a{" "}
                    <Text style={styles.bold}>
                      business owner
                    </Text>, have a{" "}
                    <Text style={styles.bold}>
                      high income
                    </Text>, or believe{" "}
                    <Text style={styles.bold}>
                      someone might be watching you
                    </Text>. Shows a{" "}
                    <Text style={styles.bold}>
                      believable balance
                    </Text>{" "}
                    to satisfy attackers who expect
                    you to have money.
                  </Text>
                </View>
              </View>

              <View style={styles.modalNotice}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={PURPLE}
                />

                <Text style={styles.modalNoticeText}>
                  You can always{" "}
                  <Text style={styles.bold}>
                    change this later
                  </Text>{" "}
                  by contacting your bank.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>
                  Got it
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
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
    fontSize: 15,
    fontWeight: "700",
    color: WHITE,
  },

  topBarSpacer: {
    width: 44,
  },

  headerContent: {
    paddingHorizontal: 22,
    paddingTop: 13,
    paddingBottom: 21,
  },

  headerContentCompact: {
    paddingTop: 7,
    paddingBottom: 14,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },

  stepPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  stepPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: WHITE,
  },

  stepCaption: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: MUTED_PURPLE,
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
    marginTop: 6,
  },

  // CONTENT

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },

  scrollContentCompact: {
    paddingTop: 12,
    paddingBottom: 8,
  },

  sectionIntro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.navy,
  },

  sectionHint: {
    fontSize: 11,
    color: colors.textSub,
  },

  // MODE CARDS

  modeCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 11,
  },

  modeCardCompact: {
    paddingVertical: 11,
    marginBottom: 9,
  },

  selectedCard: {
    backgroundColor: "#FCFBFF",
    borderColor: PURPLE,
    borderWidth: 1.5,
  },

  modeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  modeIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  modeTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF7F0",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },

  recommendedText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "700",
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#B8B5C4",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: PURPLE,
    borderWidth: 2,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PURPLE,
  },

  modeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 4,
  },

  modeDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSub,
  },

  // HELP + PRIVACY

  helpRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  helpText: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
  },

  bottomSpacer: {
    flexGrow: 1,
  },

  privateNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 6,
  },

  privateNoteText: {
    fontSize: 10,
    color: colors.textSub,
  },

  // BOTTOM ACTION

  bottomArea: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },

  bottomNote: {
  fontSize: 11,
  color: colors.textSub,
  textAlign: "center",
  marginTop: 9,
},

  continueButton: {
    minHeight: 50,
    backgroundColor: PURPLE,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  disabledButton: {
    backgroundColor: "#B9B2D0",
  },

  continueText: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
  },

  // MODAL

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.52)",
  },

  modalSheet: {
    maxHeight: "85%",
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: LINE,
    alignSelf: "center",
    marginBottom: 17,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 11,
  },

  modalHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
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
    letterSpacing: 0.7,
    color: colors.textSub,
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.navy,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 19,
    paddingBottom: 24,
  },

  modalIntro: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSub,
    marginBottom: 19,
  },

  bold: {
    fontWeight: "700",
    color: colors.navy,
  },

  modalOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  modalOptionIcon: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOptionCopy: {
    flex: 1,
  },

  modalOptionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 5,
  },

  modalOptionText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSub,
  },

  modalDivider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 19,
    marginLeft: 50,
  },

  modalNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_PURPLE,
    padding: 14,
    borderRadius: 13,
    gap: 10,
    marginTop: 22,
  },

  modalNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSub,
  },

  modalButton: {
    minHeight: 48,
    backgroundColor: PURPLE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  modalButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: WHITE,
  },
});