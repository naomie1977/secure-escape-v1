import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/utils/theme";

const { height } = Dimensions.get("window");

interface SplashScreenProps {
  onLoginPress?: () => void;
}

export default function SplashScreen({ onLoginPress }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(42)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 750,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleLoginPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLoginPress?.();
  };

  const circles = [
    { size: 120, top: 70, left: -40, opacity: 0.1 },
    { size: 190, top: 190, right: -70, opacity: 0.08 },
    { size: 90, bottom: 190, left: 34, opacity: 0.12 },
    { size: 150, bottom: 55, right: -25, opacity: 0.08 },
  ];

  return (
    <LinearGradient
      colors={["#25145F", "#25145F", "#25145F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {circles.map((circle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.floatingCircle,
            {
              width: circle.size,
              height: circle.size,
              borderRadius: circle.size / 2,
              opacity: circle.opacity,
              top: circle.top,
              left: circle.left,
              right: circle.right,
              bottom: circle.bottom,
            },
          ]}
        />
      ))}

      <Animated.View
        style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}
      >
        <LinearGradient
          colors={["#FFFFFF", "#EEF6FF"]}
          style={styles.bankCircle}
        >
          <Ionicons name="card" size={76} color={colors.primary} />
        </LinearGradient>
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.eyebrow}>GlobalOne Banking</Text>
        <Text style={styles.title}>Bank securely, wherever you are</Text>
        <Text style={styles.description}>
          View balances, manage payments, and access your everyday banking tools
          in one protected place.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLoginPress}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Sign in</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
          <Text style={styles.secondaryButtonText}>Open app settings</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  floatingCircle: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  iconWrapper: {
    position: "absolute",
    top: height * 0.17,
    alignSelf: "center",
  },
  bankCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
  },
  content: {
    width: "100%",
    paddingHorizontal: 28,
    paddingBottom: 44,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 14,
    textAlign: "center",
    lineHeight: 44,
  },
  description: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 26,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: "92%",
  },
  primaryButton: {
    width: "100%",
    borderRadius: 50,
    backgroundColor: colors.white,
    paddingVertical: 16,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
  },
  primaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
