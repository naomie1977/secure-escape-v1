// screens/Screen8_Congrats.js - Confetti icons only around the shield
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/utils/theme";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function Congrats() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const lockShake = useRef(new Animated.Value(0)).current;

  // Confetti pieces positioned relative to the shield (center at 0,0)
  const [confettiItems] = useState(() => {
    const items = [];
    const icons = ["✨", "⭐", "🌟", "💫", "⚡", "🔒"];
    const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]; // degrees
    for (let i = 0; i < 12; i++) {
      const angle = angles[i % angles.length];
      const rad = (angle * Math.PI) / 180;
      const radius = 60 + Math.random() * 20; // distance from center
      const startX = Math.cos(rad) * radius;
      const startY = Math.sin(rad) * radius;
      items.push({
        id: i,
        icon: icons[Math.floor(Math.random() * icons.length)],
        size: 16 + Math.random() * 8,
        startX,
        startY,
        delay: i * 100,
        duration: 800,
        angle,
      });
    }
    return items;
  });

  // Animated values: translateX, translateY, opacity
  const [animations] = useState(() =>
    confettiItems.map(() => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    })),
  );

  useEffect(() => {
    // Entrance animations for text and shield
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // Shield shake celebration
    Animated.loop(
      Animated.sequence([
        Animated.timing(lockShake, {
          toValue: 4,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(lockShake, {
          toValue: -4,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(lockShake, {
          toValue: 2,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(lockShake, {
          toValue: -2,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(lockShake, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 },
    ).start();

    // Animate each confetti piece: burst outward and fade
    confettiItems.forEach((item, idx) => {
      const anim = animations[idx];
      const rad = (item.angle * Math.PI) / 180;
      const outX = Math.cos(rad) * 100; // outward by 100px
      const outY = Math.sin(rad) * 100;
      Animated.sequence([
        Animated.delay(item.delay),
        Animated.parallel([
          Animated.timing(anim.translateX, {
            toValue: outX,
            duration: item.duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: outY,
            duration: item.duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 200,
            delay: item.duration - 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, []);

  const handleOk = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/settings");
  };

  const shakeInterpolate = lockShake.interpolate({
    inputRange: [-4, 4],
    outputRange: ["-4deg", "4deg"],
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#25145F", "#25145F"]}
        style={styles.gradientHeader}
      >
        <Text style={styles.backArrow} onPress={() => router.back()}>
          ‹
        </Text>
        <Text style={styles.headerTitle}>Secure Escape Active</Text>
      </LinearGradient>

      <View style={styles.whiteCard}>
        {/* Shield icon container with confetti anchored */}
        <View style={styles.iconWrapper}>
          <Animated.View
            style={[
              styles.illustration,
              {
                transform: [{ scale: scaleAnim }, { rotate: shakeInterpolate }],
              },
            ]}
          >
            <LinearGradient
              colors={["#EDE9FE", "#DBEAFE"]}
              style={styles.iconCircle}
            >
              <Ionicons
                name="shield-checkmark"
                size={64}
                color={colors.primary}
              />
            </LinearGradient>
          </Animated.View>

          {/* Confetti icons positioned relative to this wrapper */}
          {confettiItems.map((item, idx) => (
            <Animated.Text
              key={item.id}
              style={[
                styles.confettiIcon,
                {
                  fontSize: item.size,
                  left: width / 2 - 60 + item.startX,
                  top: 60 + item.startY, // roughly center of the shield
                  transform: [
                    { translateX: animations[idx].translateX },
                    { translateY: animations[idx].translateY },
                  ],
                  opacity: animations[idx].opacity,
                },
              ]}
            >
              {item.icon}
            </Animated.Text>
          ))}
        </View>

        {/* Message box */}
        <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
          <View style={styles.messageBox}>
            <Text style={styles.title}>Congratulations!!!</Text>
            <Text style={styles.message}>Your duress PIN is now active.</Text>
            <View style={styles.divider} />
            <Text style={styles.message}>
              If you&apos;re ever forced to{" "}
              <Text style={{ fontWeight: "bold" }}>transact under threat,</Text>
              {"\n"}entering this PIN will silently alert the bank and police,
              without the attacker knowing.
            </Text>
            <Text style={styles.message}>
              <Text style={{ fontWeight: "bold" }}>
                Your normal banking remains unchanged.
              </Text>
              {"\n"}Stay safe. We&apos;ve got your back.
            </Text>
          </View>
        </Animated.View>

        <TouchableOpacity style={styles.okButton} onPress={handleOk}>
          <LinearGradient
            colors={["#25145F", "#25145F"]}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Continue Banking</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  gradientHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backArrow: { fontSize: 18, color: "#fff" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  whiteCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    marginTop: -20,
    alignItems: "center",
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  illustration: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  messageBox: {
    backgroundColor: "#F8F9FC",
    borderRadius: 24,
    padding: 24,
    marginVertical: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.greyLine,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: colors.textSub,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.greyLine,
    marginVertical: 16,
  },
  okButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    marginBottom: 20,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  confettiIcon: {
    position: "absolute",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
});
