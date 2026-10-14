// screens/accounts/Card-details.tsx
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Switch,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/utils/theme";
import { useRouter, useLocalSearchParams } from "expo-router";

const { width } = Dimensions.get("window");

export default function CardDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const card = params.card ? JSON.parse(params.card as string) : null;

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [freezeModalVisible, setFreezeModalVisible] = useState(false);

  const [freezeCard, setFreezeCard] = useState(false);
  const [onlinePurchases, setOnlinePurchases] = useState(true);
  const [internationalTransactions, setInternationalTransactions] =
    useState(true);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleShowDetails = () => setWarningModalVisible(true);
  const handleWarningConfirm = () => {
    setWarningModalVisible(false);
    setPin("");
    setPinModalVisible(true);
  };

  const handlePinConfirm = () => {
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
      Alert.alert("Invalid PIN", "Please enter your 5‑digit PIN.");
      return;
    }
    setPinModalVisible(false);
    flipCard();
  };

  const handleFreezeToggle = (value: boolean) => {
    if (value) setFreezeModalVisible(true);
    else {
      setFreezeCard(false);
      Alert.alert(
        "Card Unfrozen",
        "Your card is now active and can be used normally."
      );
    }
  };

  const confirmFreeze = () => {
    setFreezeCard(true);
    setFreezeModalVisible(false);
    Alert.alert(
      "Card Frozen",
      "No payments, subscriptions or withdrawals can be made while it's frozen."
    );
  };

  const handleOnlinePurchases = (value: boolean) => {
    setOnlinePurchases(value);
    Alert.alert(
      value ? "Online Purchases Enabled" : "Online Purchases Disabled",
      value
        ? "You can now use your card for online shopping."
        : "Online purchases have been disabled."
    );
  };

  const handleInternational = (value: boolean) => {
    setInternationalTransactions(value);
    Alert.alert(
      value
        ? "International Transactions Enabled"
        : "International Transactions Disabled",
      value
        ? "Your card can now be used for international transactions."
        : "International transactions disabled."
    );
  };

  const handleTapToPay = () =>
    Alert.alert(
      "Tap to Pay",
      "Tap your card on any contactless payment terminal to pay.\n\nThis feature is already enabled on your card."
    );

  const handleReplaceStop = () =>
    Alert.alert(
      "Replace or Stop Card",
      "Choose an option:\n\n1. Report lost/stolen\n2. Replace damaged card\n3. Cancel card permanently",
      [
        {
          text: "Report Lost",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Reported",
              "We've blocked your card. A new one will be issued."
            ),
        },
        {
          text: "Replace",
          onPress: () =>
            Alert.alert(
              "Replacement",
              "A new card will be sent to your branch."
            ),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );

  const handleUpdateLimits = () => {
    Alert.alert(
      "Coming Soon",
      "Update permanent limits will be available in the next sprint."
    );
  };

  const handleTempLimits = () => {
    Alert.alert(
      "Coming Soon",
      "Set temporary limits will be available in the next sprint."
    );
  };

  if (!card) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.primaryDark}
        />
        <View style={styles.header}>
          <View style={styles.appBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.appBarTitle}>Card details</Text>
            <View style={styles.appBarSpacer} />
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Card not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
      />

      {/* DEEP PURPLE HEADER */}
      <View style={styles.header}>
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Card details</Text>
          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>CARD CONTROLS</Text>
          <Text style={styles.headerHeading}>{card.type || "My card"}</Text>
          <Text style={styles.headerDescription}>
            Manage security settings, view card details and control usage.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* FLIP CARD SECTION */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardContainer}>
            {/* FRONT SIDE */}
            <Animated.View
              style={[
                styles.flipCard,
                { transform: [{ rotateY: frontInterpolate }] },
                { pointerEvents: isFlipped ? "none" : "auto" },
              ]}
            >
              <LinearGradient
                colors={card.gradient || [colors.primaryDark, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {/* DECORATIVE CIRCLES */}
                <View
                  style={styles.decorativeCircleLarge}
                  pointerEvents="none"
                />
                <View
                  style={styles.decorativeCircleSmall}
                  pointerEvents="none"
                />

                <View style={styles.cardHeader}>
                  <View style={styles.cardBrandGroup}>
                    <View style={styles.cardBrandIcon}>
                      <Ionicons
                        name="wallet-outline"
                        size={17}
                        color={colors.white}
                      />
                    </View>
                    <Text style={styles.cardBank}>{card.bank || "CAPITEC"}</Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <View
                      style={[
                        styles.statusDot,
                        card.status !== "ACTIVE" && styles.inactiveDot,
                      ]}
                    />
                    <Text style={styles.statusText}>{card.status || "ACTIVE"}</Text>
                  </View>
                </View>

                <Text style={styles.cardTypeLabel}>{card.type || "Bank account"}</Text>

                <View style={styles.numberSection}>
                  <Text style={styles.numberLabel}>CARD NUMBER</Text>
                  <Text style={styles.cardNumber}>
                    {card.displayNumber || card.number}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.holderGroup}>
                    <Text style={styles.footerLabel}>ACCOUNT HOLDER</Text>
                    <Text style={styles.cardHolder} numberOfLines={1}>
                      {card.holder}
                    </Text>
                  </View>
                  <View style={styles.accountInfoGroup}>
                    <Text style={styles.footerLabel}>ACCOUNT</Text>
                    <Text style={styles.accountNumberText}>{card.accountNumber}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={handleShowDetails}
                  activeOpacity={0.8}
                >
                  <Text style={styles.detailsButtonText}>Show card details</Text>
                  <Ionicons name="eye-outline" size={15} color={colors.white} />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* BACK SIDE */}
            <Animated.View
              style={[
                styles.flipCard,
                styles.backCard,
                { transform: [{ rotateY: backInterpolate }] },
                { pointerEvents: isFlipped ? "auto" : "none" },
              ]}
            >
              <LinearGradient
                colors={card.gradient || [colors.primaryDark, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, styles.cardBack]}
              >
                <View
                  style={styles.decorativeCircleLarge}
                  pointerEvents="none"
                />

                <View style={styles.backContent}>
                  {[
                    { label: "Card Number", value: card.number },
                    { label: "Expiry Date", value: card.expiry || "12/28" },
                    { label: "CVV Security Code", value: card.cvv || "•••" },
                    { label: "Account Number", value: card.accountNumber },
                    { label: "Account Type", value: card.accountType || "Savings" },
                  ].map((item, idx) => (
                    <View key={idx} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{item.label}</Text>
                      <Text style={styles.detailValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.flipBackButton}
                  onPress={flipCard}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.white} />
                  <Text style={styles.flipBackText}>Hide card details</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </View>
        </View>

        {/* SECURITY & TOGGLES SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Security & usage controls</Text>
          <Text style={styles.sectionDescription}>
            Manage how and where your card can be used.
          </Text>
        </View>

        <View style={styles.toggleSection}>
          <View style={styles.toggleItem}>
            <View style={styles.toggleIconContainer}>
              <Ionicons
                name="snow-outline"
                size={20}
                color={freezeCard ? colors.dangerStrong : colors.primaryDark}
              />
            </View>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Freeze card</Text>
              <Text style={styles.toggleDescription}>
                Temporarily disable all transactions, online payments and withdrawals.
              </Text>
            </View>
            <Switch
              value={freezeCard}
              onValueChange={handleFreezeToggle}
              trackColor={{ false: "#E2E8F0", true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.toggleItem}>
            <View style={styles.toggleIconContainer}>
              <Ionicons
                name="cart-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Online purchases</Text>
              <Text style={styles.toggleDescription}>
                Allow your card to be used for digital payments and shopping.
              </Text>
            </View>
            <Switch
              value={onlinePurchases}
              onValueChange={handleOnlinePurchases}
              trackColor={{ false: "#E2E8F0", true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.toggleItem, styles.lastToggleItem]}>
            <View style={styles.toggleIconContainer}>
              <Ionicons
                name="globe-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>International transactions</Text>
              <Text style={styles.toggleDescription}>
                Enable cross-border payments and international online stores.
              </Text>
            </View>
            <Switch
              value={internationalTransactions}
              onValueChange={handleInternational}
              trackColor={{ false: "#E2E8F0", true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* CARD MANAGEMENT ACTIONS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Card services</Text>
          <Text style={styles.sectionDescription}>
            Quick actions to update limits or manage physical cards.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleTapToPay}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="radio-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.actionTextGroup}>
              <Text style={styles.actionTitle}>Contactless payment</Text>
              <Text style={styles.actionDescription}>Tap to pay is enabled</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleUpdateLimits}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="options-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.actionTextGroup}>
              <Text style={styles.actionTitle}>Update permanent limits</Text>
              <Text style={styles.actionDescription}>Daily ATM and online spend caps</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleTempLimits}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="time-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.actionTextGroup}>
              <Text style={styles.actionTitle}>Set temporary limits</Text>
              <Text style={styles.actionDescription}>Temporary increase for large purchases</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, styles.lastActionItem]}
            onPress={handleReplaceStop}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.dangerStrong} />
            </View>
            <View style={styles.actionTextGroup}>
              <Text style={[styles.actionTitle, { color: colors.dangerStrong }]}>
                Replace or Stop card
              </Text>
              <Text style={styles.actionDescription}>Report lost, stolen or damaged card</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* WARNING MODAL */}
      <Modal
        animationType="fade"
        transparent
        visible={warningModalVisible}
        onRequestClose={() => setWarningModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setWarningModalVisible(false)}
        >
          <View style={styles.warningModalContent}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={36} color={colors.dangerStrong} />
            </View>
            <Text style={styles.warningEyebrow}>SECURITY NOTICE</Text>
            <Text style={styles.warningTitle}>Protect your card details</Text>
            <Text style={styles.warningDescription}>
              Never share your full card number, CVV or banking PIN with anyone. Capitec staff will never ask for these details.
            </Text>
            <TouchableOpacity
              style={styles.warningButton}
              onPress={handleWarningConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.warningButtonText}>I understand, continue</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PIN CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent
        visible={pinModalVisible}
        onRequestClose={() => setPinModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPinModalVisible(false)}
        >
          <View style={styles.pinModalContent}>
            <View style={styles.pinIconCircle}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.primaryDark} />
            </View>
            <Text style={styles.pinTitle}>Enter your PIN</Text>
            <Text style={styles.pinSubtitle}>
              Confirm your 5-digit banking PIN to view sensitive card numbers.
            </Text>
            <TextInput
              style={styles.pinInput}
              placeholder="•••••"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={5}
              value={pin}
              onChangeText={setPin}
              autoFocus
            />
            <View style={styles.pinButtonRow}>
              <TouchableOpacity
                style={[styles.pinButton, styles.pinCancel]}
                onPress={() => setPinModalVisible(false)}
              >
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pinButton, styles.pinConfirm]}
                onPress={handlePinConfirm}
              >
                <Text style={styles.pinConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FREEZE CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent
        visible={freezeModalVisible}
        onRequestClose={() => setFreezeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFreezeModalVisible(false)}
        >
          <View style={styles.confirmModalContent}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="snow-outline" size={36} color={colors.dangerStrong} />
            </View>
            <Text style={styles.confirmTitle}>Freeze your card?</Text>
            <Text style={styles.confirmDescription}>
              While frozen, all card purchases, subscriptions and ATM withdrawals will be declined immediately. You can unfreeze it at any time.
            </Text>
            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancel]}
                onPress={() => setFreezeModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmFreeze]}
                onPress={confirmFreeze}
              >
                <Text style={styles.confirmFreezeText}>Freeze card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  backBtn: {
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E4E1FF",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  headerHeading: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  headerDescription: {
    fontSize: 13,
    color: "#E4E1FF",
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 320,
  },

  // SCROLL CONTENT
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // CARD DISPLAY
  cardWrapper: {
    marginBottom: 24,
  },
  cardContainer: {
    width: "100%",
    height: 224,
    alignItems: "center",
    justifyContent: "center",
  },
  flipCard: {
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    position: "absolute",
  },
  backCard: {
    transform: [{ rotateY: "180deg" }],
  },
  card: {
    borderRadius: 20,
    padding: 20,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#25145F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  cardBack: {
    justifyContent: "space-between",
  },
  decorativeCircleLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    top: -110,
    right: -80,
  },
  decorativeCircleSmall: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    bottom: -65,
    left: -40,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBank: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  inactiveDot: {
    backgroundColor: "#F87171",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
  cardTypeLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    marginTop: 4,
  },
  numberSection: {
    marginTop: 2,
  },
  numberLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.white,
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  holderGroup: {
    flex: 1,
  },
  accountInfoGroup: {
    alignItems: "flex-end",
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cardHolder: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
  accountNumberText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  detailsButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
  },
  backContent: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  flipBackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    gap: 6,
    marginTop: 6,
  },
  flipBackText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },

  // SECTION HEADERS
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.2,
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 2,
  },

  // TOGGLES
  toggleSection: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
  },
  lastToggleItem: {
    borderBottomWidth: 0,
  },
  toggleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  toggleDescription: {
    fontSize: 11,
    color: colors.textSub,
    marginTop: 2,
    lineHeight: 16,
  },

  // ACTIONS
  actionSection: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextGroup: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  actionDescription: {
    fontSize: 11,
    color: colors.textSub,
    marginTop: 2,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  warningModalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  warningEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.dangerStrong,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
    marginBottom: 8,
  },
  warningDescription: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  warningButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  warningButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },

  pinModalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  pinIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 4,
  },
  pinSubtitle: {
    fontSize: 12,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 20,
  },
  pinInput: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 12,
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryDark,
    paddingVertical: 8,
    width: "70%",
    color: colors.navy,
  },
  pinButtonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 24,
  },
  pinButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  pinCancel: {
    backgroundColor: colors.surfaceMuted,
  },
  pinCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSub,
  },
  pinConfirm: {
    backgroundColor: colors.primaryDark,
  },
  pinConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },

  confirmModalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 12,
    textAlign: "center",
  },
  confirmDescription: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  confirmButtonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 24,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmCancel: {
    backgroundColor: colors.surfaceMuted,
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSub,
  },
  confirmFreeze: {
    backgroundColor: colors.dangerStrong,
  },
  confirmFreezeText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.dangerStrong,
  },
});
