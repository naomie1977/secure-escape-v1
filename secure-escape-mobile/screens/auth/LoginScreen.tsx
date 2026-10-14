import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/utils/theme";
import {
  confirmTwoFactorLoginSetup,
  login,
  setupTwoFactorLogin,
  verifyTwoFactorLogin,
} from "@/services/authService";
import { saveAuthSession } from "@/services/tokenStore";
import * as Location from "expo-location";
import Constants from "expo-constants";
import {
  enableBiometricLogin,
  isBiometricLoginAvailable,
  loginWithBiometrics,
} from "@/services/biometricAuthService";
import {
  isNativeScreenRecordingSupported,
  startScreenRecording,
} from "@/modules/secure-escape-screen-recorder/src/SecureEscapeScreenRecorder";

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  /*
    Existing authenticator verification flow for customers who have
    already enrolled 2FA.
  */
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  /*
    First-time authenticator enrollment flow.

    The setup challenge is temporary and is not the TOTP secret.
    The manual entry key is shown only during enrollment so the
    customer can add Secure Escape to their authenticator app.
  */
  const [requiresTwoFactorSetup, setRequiresTwoFactorSetup] = useState(false);
  const [twoFactorSetupChallengeToken, setTwoFactorSetupChallengeToken] =
    useState("");
  const [twoFactorManualEntryKey, setTwoFactorManualEntryKey] = useState("");
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState("");
  const [twoFactorSetupError, setTwoFactorSetupError] = useState<string | null>(
    null,
  );

  const [biometricOption, setBiometricOption] = useState<{
    available: boolean;
    label: string | null;
  }>({
    available: false,
    label: null,
  });

  React.useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const result = await isBiometricLoginAvailable();
        setBiometricOption(result);
      } catch (error) {
        console.warn("[LOGIN] Biometric availability check failed:", error);
        setBiometricOption({
          available: false,
          label: null,
        });
      }
    };

    checkBiometrics();
  }, []);

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const clearError = () => {
    setError(null);
    setShowErrorModal(false);
  };

  const getValidationMessage = () => {
    const missingFields: string[] = [];

    if (!email.trim()) {
      missingFields.push("email");
    }

    if (!pin.trim()) {
      missingFields.push("PIN");
    } else if (pin.length !== 4) {
      return "Please enter exactly 4 digits for your app PIN.";
    }

    if (missingFields.length === 0) {
      return null;
    }

    if (missingFields.length === 1) {
      return `Please enter your ${missingFields[0]}.`;
    }

    const lastField = missingFields.pop();

    return `Please enter your ${missingFields.join(", ")} and ${lastField}.`;
  };

  const getLoginContext = async () => {
    console.log("[LOGIN] Starting location collection");
    console.log("[LOGIN] Requesting foreground location permission");

    const permission = await Location.requestForegroundPermissionsAsync();

    console.log("[LOGIN] Location permission:", permission.status);

    if (permission.status !== "granted") {
      throw new Error(
        "Location permission is required to sign in to Secure Escape.",
      );
    }

    console.log("[LOGIN] Requesting current GPS position");

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    console.log("[LOGIN] GPS position received");

    return {
      deviceInfo: `${Platform.OS} â€¢ ${
        Constants.deviceName ?? "Unknown device"
      } â€¢ Expo mobile app`,
      ipAddress: "",
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy ?? undefined,
    };
  };

  const getFriendlyErrorMessage = (error: unknown): string => {
    if (!error) {
      return "An unexpected error occurred. Please try again.";
    }

    const message =
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "";

    const lower = message.toLowerCase();

    if (lower.includes("location permission")) {
      return "Location access is required to use Secure Escape. Please enable location access and try again.";
    }

    if (
      lower.includes("network") ||
      lower.includes("connection") ||
      lower.includes("timeout")
    ) {
      return "Network error. Please check your connection.";
    }

    if (
      lower.includes("invalid") ||
      lower.includes("credentials") ||
      lower.includes("incorrect")
    ) {
      return "Invalid email or PIN. Please try again.";
    }

    if (
      lower.includes("server") ||
      lower.includes("internal") ||
      lower.includes("500")
    ) {
      return "Something went wrong. Please try again later.";
    }

    return "Unable to sign in. Please try again.";
  };

  const completeLogin = async (response: {
    token: string;
    sessionMode: "Normal" | "Duress" | "";
    userSessionId: string;
    userId: string;
  }) => {
    if (!response.token) {
      throw new Error("Authentication token was not returned.");
    }

    if (response.sessionMode !== "Normal" && response.sessionMode !== "Duress") {
      throw new Error("Authenticated session mode was not returned.");
    }

    console.log("[LOGIN] Saving authentication session");

    const authenticatedSession = {
      token: response.token,
      sessionMode: response.sessionMode,
      userSessionId: response.userSessionId,
      userId: response.userId,
    };

    await saveAuthSession(authenticatedSession);

    if (
      response.sessionMode === "Duress" &&
      isNativeScreenRecordingSupported()
    ) {
      try {
        console.log("[LOGIN] Starting duress session screen recording");

        const recording = await startScreenRecording();

        if (recording.started) {
          console.log("[LOGIN] Duress screen recording started");
        } else if (recording.cancelled) {
          console.log("[LOGIN] Screen recording consent was not granted");
        }
      } catch (recordingError) {
        console.error(
          "[LOGIN] Unable to start duress screen recording:",
          recordingError,
        );
      }
    }

    console.log("[LOGIN] Authentication session saved");

    if (biometricsEnabled) {
      console.log("[LOGIN] Enabling biometric login");

      await enableBiometricLogin(authenticatedSession);

      console.log("[LOGIN] Biometric login enabled");
    }

    console.log("[LOGIN] Calling login success navigation");

    onLoginSuccess?.();

    console.log("[LOGIN] Login flow completed");
  };

  const startFirstTimeTwoFactorSetup = async (challengeToken: string) => {
    if (!challengeToken) {
      throw new Error(
        "Two-factor authentication setup challenge was not returned.",
      );
    }

    console.log("[LOGIN] Starting first-time authenticator enrollment");

    const setupResponse = await setupTwoFactorLogin({
      challengeToken,
    });

    setTwoFactorSetupChallengeToken(challengeToken);
    setTwoFactorManualEntryKey(setupResponse.manualEntryKey);
    setTwoFactorSetupCode("");
    setTwoFactorSetupError(null);
    setRequiresTwoFactor(false);
    setRequiresTwoFactorSetup(true);

    console.log("[LOGIN] Authenticator enrollment information received");
  };

  const handleSubmit = async () => {
    console.log("[LOGIN] Submit pressed");

    const validationMessage = getValidationMessage();

    if (validationMessage) {
      console.log("[LOGIN] Validation failed:", validationMessage);
      showError(validationMessage);
      return;
    }

    if (emailError || pinError) {
      console.log("[LOGIN] Field validation errors present");
      showError("Please fix the highlighted fields before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      clearError();
      setTwoFactorError(null);
      setTwoFactorSetupError(null);

      console.log("[LOGIN] Getting login context");

      const loginContext = await getLoginContext();

      console.log("[LOGIN] Calling backend login");

      const response = await login({
        email: email.trim(),
        pin: pin.trim(),
        ...loginContext,
      });

      console.log("[LOGIN] Backend login response received");

      /*
        First-time enrollment is checked before the normal 2FA flow.
        No JWT is accepted while either MFA step is pending.
      */
      if (response.requiresTwoFactorSetup) {
        if (!response.twoFactorSetupChallengeToken) {
          throw new Error(
            "Two-factor authentication setup challenge was not returned.",
          );
        }

        console.log("[LOGIN] First-time authenticator setup required");

        await startFirstTimeTwoFactorSetup(
          response.twoFactorSetupChallengeToken,
        );

        return;
      }

      if (response.requiresTwoFactor) {
        if (!response.twoFactorChallengeToken) {
          throw new Error(
            "Two-factor authentication challenge was not returned.",
          );
        }

        console.log("[LOGIN] Authenticator verification required");

        setTwoFactorChallengeToken(response.twoFactorChallengeToken);
        setTwoFactorCode("");
        setRequiresTwoFactorSetup(false);
        setRequiresTwoFactor(true);

        return;
      }

      await completeLogin(response);
    } catch (error) {
      console.error("[LOGIN] FAILED:", error);

      const friendlyMessage = getFriendlyErrorMessage(error);

      showError(friendlyMessage);
    } finally {
      console.log("[LOGIN] Submit flow finished");
      setIsSubmitting(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (!/^\d{6}$/.test(twoFactorCode)) {
      setTwoFactorError(
        "Please enter the 6-digit code from your authenticator app.",
      );
      return;
    }

    if (!twoFactorChallengeToken) {
      setTwoFactorError(
        "Your authentication challenge is no longer available. Please return to sign in and try again.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setTwoFactorError(null);
      clearError();

      console.log("[LOGIN] Verifying authenticator code");

      const response = await verifyTwoFactorLogin({
        challengeToken: twoFactorChallengeToken,
        code: twoFactorCode,
      });

      console.log("[LOGIN] Authenticator verification succeeded");

      await completeLogin(response);
    } catch (error) {
      console.error("[LOGIN] Two-factor verification failed:", error);

      const message =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        message.includes("invalid") ||
        message.includes("expired") ||
        message.includes("challenge")
      ) {
        setTwoFactorError(
          "The authenticator code is invalid or the sign-in request has expired. Please try again.",
        );
      } else if (
        message.includes("network") ||
        message.includes("connection") ||
        message.includes("timeout")
      ) {
        setTwoFactorError(
          "Network error. Please check your connection and try again.",
        );
      } else {
        setTwoFactorError(
          "Unable to verify the authenticator code. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTwoFactorSetup = async () => {
    if (!/^\d{6}$/.test(twoFactorSetupCode)) {
      setTwoFactorSetupError(
        "Please enter the 6-digit code from your authenticator app.",
      );
      return;
    }

    if (!twoFactorSetupChallengeToken) {
      setTwoFactorSetupError(
        "Your setup session is no longer available. Please return to sign in and try again.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setTwoFactorSetupError(null);
      clearError();

      console.log("[LOGIN] Confirming authenticator enrollment");

      const response = await confirmTwoFactorLoginSetup({
        challengeToken: twoFactorSetupChallengeToken,
        code: twoFactorSetupCode,
      });

      console.log("[LOGIN] Authenticator enrollment confirmed");

      /*
        The backend only returns the final JWT after the first valid
        authenticator code has successfully enabled 2FA.
      */
      await completeLogin(response);
    } catch (error) {
      console.error("[LOGIN] Authenticator enrollment confirmation failed");

      const message =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        message.includes("invalid") ||
        message.includes("expired") ||
        message.includes("challenge") ||
        message.includes("code")
      ) {
        setTwoFactorSetupError(
          "The authenticator code is invalid or the setup session has expired. Check the current code and try again.",
        );
      } else if (
        message.includes("network") ||
        message.includes("connection") ||
        message.includes("timeout")
      ) {
        setTwoFactorSetupError(
          "Network error. Please check your connection and try again.",
        );
      } else {
        setTwoFactorSetupError(
          "Unable to complete authenticator setup. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackFromTwoFactor = () => {
    setRequiresTwoFactor(false);
    setTwoFactorChallengeToken("");
    setTwoFactorCode("");
    setTwoFactorError(null);
    setPin("");
    setPinError(null);
  };

  const handleBackFromTwoFactorSetup = () => {
    setRequiresTwoFactorSetup(false);
    setTwoFactorSetupChallengeToken("");
    setTwoFactorManualEntryKey("");
    setTwoFactorSetupCode("");
    setTwoFactorSetupError(null);
    setPin("");
    setPinError(null);
  };

  const validateEmail = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setEmailError("Email is required.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }

    setEmailError(null);
    return true;
  };

  const validatePin = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setPinError("PIN is required.");
      return false;
    }

    if (!/^\d+$/.test(trimmed)) {
      setPinError("PIN must contain only digits.");
      return false;
    }

    if (trimmed.length !== 4) {
      setPinError("PIN must be exactly 4 digits.");
      return false;
    }

    setPinError(null);
    return true;
  };

  const handleEmailBlur = () => {
    validateEmail(email);
  };

  const handlePinBlur = () => {
    validatePin(pin);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);

    if (emailError) {
      const trimmed = value.trim();

      if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setEmailError(null);
      } else if (!trimmed) {
        setEmailError("Email is required.");
      }
    }
  };

  const handlePinChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");

    setPin(numericValue);

    if (pinError) {
      if (numericValue.length === 4) {
        setPinError(null);
      } else if (numericValue.length === 0) {
        setPinError("PIN is required.");
      } else {
        setPinError("PIN must be exactly 4 digits.");
      }
    }
  };

  const handleTwoFactorCodeChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);

    setTwoFactorCode(numericValue);

    if (twoFactorError) {
      setTwoFactorError(null);
    }
  };

  const handleTwoFactorSetupCodeChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);

    setTwoFactorSetupCode(numericValue);

    if (twoFactorSetupError) {
      setTwoFactorSetupError(null);
    }
  };

  const isFormValid = () => {
    const trimmedEmail = email.trim();
    const trimmedPin = pin.trim();

    const emailValid =
      trimmedEmail.length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    const pinValid = /^\d{4}$/.test(trimmedPin);

    return emailValid && pinValid;
  };

  const handleBiometricLogin = async () => {
    try {
      console.log("[LOGIN] Starting biometric login");

      const session = await loginWithBiometrics();

      if (!session) {
        console.log("[LOGIN] Biometric login cancelled or unavailable");
        return;
      }

      await saveAuthSession(session);

      console.log("[LOGIN] Biometric session restored");

      onLoginSuccess?.();
    } catch (error) {
      console.error("[LOGIN] Biometric login failed:", error);
      showError("Unable to use biometric login. Please sign in with your PIN.");
    }
  };

  /*
    FIRST-TIME AUTHENTICATOR ENROLLMENT SCREEN

    We intentionally use the manual entry key here because the user may
    be running Secure Escape and the authenticator app on the same phone.
    A QR code can be added later without changing the backend flow.
  */
  if (requiresTwoFactorSetup) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.twoFactorScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.twoFactorContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Secure Escape</Text>
          </View>

          <View style={styles.twoFactorCard}>
            <View style={styles.securityIconCircle}>
              
            </View>

            <Text style={styles.twoFactorTitle}>Set up Authenticator</Text>

            <Text style={styles.twoFactorSubtitle}>
              Secure Escape requires two-factor authentication. Add your Secure
              Escape account to Google Authenticator, Microsoft Authenticator,
              or another compatible authenticator app.
            </Text>

            <View style={styles.setupStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>

              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Open your authenticator app</Text>
                <Text style={styles.stepDescription}>
                  Choose the option to add a new account, then select the option
                  to enter a setup key manually.
                </Text>
              </View>
            </View>

            <View style={styles.setupStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>

              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Enter this setup key</Text>
                <Text style={styles.stepDescription}>
                  Use Secure Escape as the account name and select
                  time-based authentication if your authenticator asks.
                </Text>
              </View>
            </View>

            <View style={styles.manualKeyContainer}>
              <Text style={styles.manualKeyLabel}>Manual setup key</Text>

              <Text selectable style={styles.manualKey}>
                {twoFactorManualEntryKey}
              </Text>

              <Text style={styles.manualKeyWarning}>
                Keep this key private. Anyone with this key could generate your
                authenticator codes.
              </Text>
            </View>

            <View style={styles.setupStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>

              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Confirm your setup</Text>
                <Text style={styles.stepDescription}>
                  After Secure Escape appears in your authenticator app, enter
                  the current 6-digit code below.
                </Text>
              </View>
            </View>

            <Text style={styles.twoFactorLabel}>6-digit code</Text>

            <TextInput
              style={[
                styles.twoFactorInput,
                twoFactorSetupError && styles.inputError,
              ]}
              value={twoFactorSetupCode}
              onChangeText={handleTwoFactorSetupCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#B8BDC8"
              textContentType="oneTimeCode"
            />

            {twoFactorSetupError && (
              <Text style={styles.twoFactorError}>
                {twoFactorSetupError}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (twoFactorSetupCode.length !== 6 || isSubmitting) &&
                  styles.disabledButton,
              ]}
              onPress={handleConfirmTwoFactorSetup}
              disabled={twoFactorSetupCode.length !== 6 || isSubmitting}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary]}
                style={styles.gradientButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    Confirm and continue
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackFromTwoFactorSetup}
              disabled={isSubmitting}
            >
              <Text style={styles.backButtonText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  /*
    EXISTING 2FA VERIFICATION SCREEN

    This is used on future logins after the customer has successfully
    completed the enrollment flow above.
  */
  if (requiresTwoFactor) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.twoFactorScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.twoFactorContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Secure Escape</Text>
          </View>

          <View style={styles.twoFactorCard}>
            <View style={styles.securityIconCircle}>
              
            </View>

            <Text style={styles.twoFactorTitle}>
              Authenticator verification
            </Text>

            <Text style={styles.twoFactorSubtitle}>
              Open your authenticator app and enter the current 6-digit code to
              complete sign in.
            </Text>

            <Text style={styles.twoFactorLabel}>6-digit code</Text>

            <TextInput
              style={[
                styles.twoFactorInput,
                twoFactorError && styles.inputError,
              ]}
              value={twoFactorCode}
              onChangeText={handleTwoFactorCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#B8BDC8"
              textContentType="oneTimeCode"
              autoFocus
            />

            {twoFactorError && (
              <Text style={styles.twoFactorError}>{twoFactorError}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (twoFactorCode.length !== 6 || isSubmitting) &&
                  styles.disabledButton,
              ]}
              onPress={handleVerifyTwoFactor}
              disabled={twoFactorCode.length !== 6 || isSubmitting}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary]}
                style={styles.gradientButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Verify and sign in</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackFromTwoFactor}
              disabled={isSubmitting}
            >
              <Text style={styles.backButtonText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <View style={{ width: 24 }} />
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Secure Escape</Text>
      </View>

      {biometricOption.available && (
        <TouchableOpacity
          style={styles.biometricLoginButton}
          onPress={handleBiometricLogin}
        >
          <Text style={styles.biometricLoginText}>
            Log in with {biometricOption.label}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.pinArea}>
        <View style={styles.pinLabelRow}>
          <Text style={styles.pinLabel}>
            Email <Text style={styles.required}></Text>
          </Text>
        </View>

        <TextInput
          style={[styles.textInput, emailError && styles.inputError]}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={handleEmailChange}
          onBlur={handleEmailBlur}
          placeholder="Enter your email"
          placeholderTextColor="#ccc"
          maxLength={40}
        />

        {emailError && <Text style={styles.fieldError}>{emailError}</Text>}

        <View style={[styles.pinLabelRow, { marginTop: 16 }]}>
          <Text style={styles.pinLabel}>
            Enter app PIN <Text style={styles.required}></Text>
          </Text>

          <TouchableOpacity>
            <Text style={styles.forgotPin}>Forgot PIN</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.pinInput, pinError && styles.inputError]}
          secureTextEntry
          maxLength={4}
          keyboardType="numeric"
          value={pin}
          onChangeText={handlePinChange}
          onBlur={handlePinBlur}
          placeholder="• • • •"
          placeholderTextColor="#ccc"
        />

        {pinError && <Text style={styles.fieldError}>{pinError}</Text>}

        {error && !emailError && !pinError && (
          <TouchableOpacity
            style={styles.errorBanner}
            activeOpacity={0.8}
            onPress={() => setShowErrorModal(true)}
          >
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorBannerText}>{error}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid() || isSubmitting) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid() || isSubmitting}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary]}
            style={styles.gradientButton}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.biometricsSection}>
        <View style={styles.biometricsRow}>
          <View style={styles.biometricsText}>
            <Text style={styles.biometricsTitle}>Biometrics</Text>

            <Text style={styles.biometricsSubtitle}>
              Sign in and authenticate with fingerprint or facial recognition
            </Text>
          </View>

          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{
              false: colors.greyLine,
              true: colors.primary,
            }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity
          style={styles.dontShowRow}
          onPress={() => setDontShowAgain(!dontShowAgain)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              dontShowAgain && styles.checkboxChecked,
            ]}
          >
            {dontShowAgain && <Text style={styles.checkmark}>{"\u2713"}</Text>}
          </View>

          <Text style={styles.dontShowText}>
            Don&apos;t show me this again
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={showErrorModal && !!error}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModal}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIcon}>!</Text>
            </View>

            <Text style={styles.modalTitle}>Could not sign in</Text>

            <Text style={styles.modalMessage}>{error}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.85}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 75,
    marginBottom: 20,
  },

  logoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },

  logoText: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -1,
  },

  logoO: {
    borderWidth: 4,
    borderColor: colors.gradientEnd,
    borderRadius: 38,
    width: 42,
    height: 42,
    textAlign: "center",
    lineHeight: 36,
    marginHorizontal: 2,
    fontSize: 36,
    fontWeight: "800",
    color: colors.navy,
  },

  pinArea: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },

  pinLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  pinLabel: {
    fontSize: 14,
    color: colors.textSub,
  },

  required: {
    color: "#DC2626",
    fontWeight: "700",
  },

  forgotPin: {
    fontSize: 13,
    color: colors.gradientEnd,
    textDecorationLine: "underline",
  },

  textInput: {
    borderWidth: 1.5,
    borderColor: colors.greyLine,
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
    marginBottom: 4,
  },

  pinInput: {
    borderWidth: 1.5,
    borderColor: colors.greyLine,
    borderRadius: 16,
    padding: 14,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
    backgroundColor: "#FAFAFA",
    marginBottom: 4,
  },

  inputError: {
    borderColor: "#DC2626",
    borderWidth: 2,
  },

  fieldError: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 8,
  },

  submitButton: {
    marginTop: 28,
    borderRadius: 50,
    overflow: "hidden",
  },

  gradientButton: {
    paddingVertical: 16,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  disabledButton: {
    opacity: 0.6,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 12,
  },

  errorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    color: "#fff",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "900",
  },

  errorBannerText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  biometricsSection: {
    marginHorizontal: 20,
    backgroundColor: "#F8F9FC",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.greyLine,
    marginTop: 10,
  },

  biometricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  biometricsText: {
    flex: 1,
    marginRight: 12,
  },

  biometricsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 4,
  },

  biometricsSubtitle: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 18,
  },

  dontShowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.greyLine,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  dontShowText: {
    fontSize: 13,
    color: colors.textSub,
  },

  bottomSpacer: {
    height: 30,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  errorModal: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },

  modalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  modalIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DC2626",
    color: "#fff",
    textAlign: "center",
    lineHeight: 30,
    fontWeight: "900",
    fontSize: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
  },

  modalMessage: {
    marginTop: 8,
    color: colors.textSub,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  modalButton: {
    marginTop: 20,
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
  },

  modalButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  biometricLoginButton: {
    marginHorizontal: 24,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
  },

  biometricLoginText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },

  twoFactorScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 40,
  },

  twoFactorContainer: {
    width: "100%",
  },

  twoFactorCard: {
    marginHorizontal: 24,
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: 24,
    padding: 22,
  },

  securityIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    marginBottom: 16,
  },

  securityIcon: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: "900",
  },

  twoFactorTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
  },

  twoFactorSubtitle: {
    marginTop: 10,
    marginBottom: 24,
    color: colors.textSub,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  twoFactorLabel: {
    fontSize: 14,
    color: colors.textSub,
    marginBottom: 8,
  },

  twoFactorInput: {
    borderWidth: 1.5,
    borderColor: colors.greyLine,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 10,
    textAlign: "center",
    backgroundColor: "#fff",
  },

  twoFactorError: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 8,
  },

  backButton: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8,
  },

  backButtonText: {
    color: colors.gradientEnd,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  setupStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  stepNumberText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },

  stepDescription: {
    color: colors.textSub,
    fontSize: 13,
    lineHeight: 19,
  },

  manualKeyContainer: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.greyLine,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  manualKeyLabel: {
    color: colors.textSub,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  manualKey: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 2,
    lineHeight: 26,
  },

  manualKeyWarning: {
    color: colors.textSub,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
});



