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
import { getLastLoginEmail, saveAuthSession, setLastLoginEmail } from "@/services/tokenStore";
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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loginLocked, setLoginLocked] = useState(false);

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

    getLastLoginEmail()
      .then((lastEmail) => {
        if (lastEmail) {
          setEmail(lastEmail);
        }
      })
      .catch((error) => {
        console.warn("[LOGIN] Failed to load remembered email:", error);
      });
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

    if (email.trim()) {
      try {
        await setLastLoginEmail(email.trim());
      } catch (saveEmailError) {
        console.warn("[LOGIN] Failed to save login email:", saveEmailError);
      }
    }

    setFailedAttempts(0);
    setLoginLocked(false);

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
    if (loginLocked) return;

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

        setFailedAttempts(0);
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

        setFailedAttempts(0);
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
      const message = error instanceof Error ? error.message : String(error ?? "");
      const lower = message.toLowerCase();
      const isInvalidCredentials =
        lower.includes("invalid") ||
        lower.includes("credentials") ||
        lower.includes("incorrect") ||
        lower.includes("unauthorized") ||
        lower.includes("401");

      if (isInvalidCredentials) {
        const nextAttempt = failedAttempts + 1;
        setFailedAttempts(nextAttempt);

        if (nextAttempt >= 3) {
          setLoginLocked(true);
          showError(
            "For your security, sign-in has been temporarily locked after three unsuccessful attempts. Please contact your bank for assistance."
          );
        } else {
          showError(friendlyMessage);
        }
      } else {
        showError(friendlyMessage);
      }
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
      <View style={styles.root}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.twoFactorScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brandBlock}>
            <Text style={styles.logoText}>
              Secure<Text style={styles.logoO}>E</Text>scape
            </Text>
            <Text style={styles.brandSubtitle}>Secure banking, simply.</Text>
          </View>

          <View style={styles.twoFactorCard}>
            <View style={styles.securityIconCircle}>
              <Text style={styles.securityIcon}>✓</Text>
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
                  Use Secure Escape as the account name and select time-based
                  authentication if your authenticator asks.
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

            <Text style={styles.fieldLabel}>6-digit code</Text>

            <TextInput
              style={[
                styles.twoFactorInput,
                twoFactorSetupError ? styles.inputError : null,
              ]}
              value={twoFactorSetupCode}
              onChangeText={handleTwoFactorSetupCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              textContentType="oneTimeCode"
            />

            {twoFactorSetupError ? (
              <Text style={styles.fieldError}>{twoFactorSetupError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (twoFactorSetupCode.length !== 6 || isSubmitting) &&
                  styles.primaryButtonDisabled,
              ]}
              onPress={handleConfirmTwoFactorSetup}
              disabled={twoFactorSetupCode.length !== 6 || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Confirm and continue
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackFromTwoFactorSetup}
              disabled={isSubmitting}
            >
              <Text style={styles.backButtonText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  /*
    EXISTING 2FA VERIFICATION SCREEN

    This is used on future logins after the customer has successfully
    completed the enrollment flow above.
  */
  if (requiresTwoFactor) {
    return (
      <View style={styles.root}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.twoFactorScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brandBlock}>
            <Text style={styles.logoText}>
              Secure<Text style={styles.logoO}>E</Text>scape
            </Text>
            <Text style={styles.brandSubtitle}>Secure banking, simply.</Text>
          </View>

          <View style={styles.twoFactorCard}>
            <View style={styles.securityIconCircle}>
              <Text style={styles.securityIcon}>✓</Text>
            </View>

            <Text style={styles.twoFactorTitle}>
              Authenticator verification
            </Text>

            <Text style={styles.twoFactorSubtitle}>
              Open your authenticator app and enter the current 6-digit code to
              complete sign in.
            </Text>

            <Text style={styles.fieldLabel}>6-digit code</Text>

            <TextInput
              style={[
                styles.twoFactorInput,
                twoFactorError ? styles.inputError : null,
              ]}
              value={twoFactorCode}
              onChangeText={handleTwoFactorCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              textContentType="oneTimeCode"
              autoFocus
            />

            {twoFactorError ? (
              <Text style={styles.fieldError}>{twoFactorError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (twoFactorCode.length !== 6 || isSubmitting) &&
                  styles.primaryButtonDisabled,
              ]}
              onPress={handleVerifyTwoFactor}
              disabled={twoFactorCode.length !== 6 || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify and sign in</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackFromTwoFactor}
              disabled={isSubmitting}
            >
              <Text style={styles.backButtonText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const canSubmit = isFormValid() && !isSubmitting;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={styles.brandBlock}>
          <Text style={styles.logoText}>
            Secure<Text style={styles.logoO}>E</Text>scape
          </Text>
          <Text style={styles.brandSubtitle}>Secure banking, simply.</Text>
        </View>

        {/* Biometric quick login (only when available) */}
        {biometricOption.available && (
          <TouchableOpacity
            style={styles.biometricLoginButton}
            onPress={handleBiometricLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.biometricLoginText}>
              Log in with {biometricOption.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Form */}
        <View style={styles.formArea}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={handleEmailChange}
              editable={!loginLocked}
              onBlur={handleEmailBlur}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              maxLength={40}
            />
            {emailError ? (
              <Text style={styles.fieldError}>{emailError}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Enter app PIN</Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.inlineLink}>Forgot PIN</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.input,
                styles.pinInput,
                pinError ? styles.inputError : null,
              ]}
              secureTextEntry
              maxLength={4}
              keyboardType="numeric"
              value={pin}
              onChangeText={handlePinChange}
              editable={!loginLocked}
              onBlur={handlePinBlur}
              placeholder="••••"
              placeholderTextColor="#9CA3AF"
            />
            {pinError ? (
              <Text style={styles.fieldError}>{pinError}</Text>
            ) : null}
          </View>

          {/* Inline error banner */}
          {error && !emailError && !pinError ? (
            <TouchableOpacity
              style={styles.errorBanner}
              activeOpacity={0.85}
              onPress={() => setShowErrorModal(true)}
            >
              <View style={styles.errorBadge}>
                <Text style={styles.errorBadgeText}>!</Text>
              </View>
              <Text style={styles.errorBannerText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canSubmit || loginLocked) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loginLocked}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Biometrics enrolment */}
        <View style={styles.biometricsCard}>
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
              trackColor={{ false: "#D6D9E0", true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setDontShowAgain(!dontShowAgain)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                dontShowAgain && styles.checkboxChecked,
              ]}
            >
              {dontShowAgain ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Don&apos;t show me this again
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Error modal */}
      <Modal
        transparent
        visible={showErrorModal && !!error}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIconText}>!</Text>
            </View>
            <Text style={styles.modalTitle}>
              {loginLocked
                ? "Sign-in temporarily locked"
                : "Could not sign in"}
            </Text>
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
    </View>
  );
}

const T = {
  sp4: 4,
  sp8: 8,
  sp12: 12,
  sp16: 16,
  sp20: 20,
  sp24: 24,
  sp32: 32,
  sp40: 40,
  radiusSm: 6,
  radiusMd: 8,
  radiusLg: 12,
  radiusXl: 16,
  inputH: 52,
  buttonH: 52,
  surface: "#FFFFFF",
  surfaceMuted: "#F7F8FA",
  border: "#E4E6EC",
  borderStrong: "#D6D9E0",
  textPrimary: "#0F172A",
  textMuted: "#64748B",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
  dangerText: "#991B1B",
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.surface,
  },

  container: {
    flex: 1,
    backgroundColor: T.surface,
  },

  scrollContent: {
    paddingHorizontal: T.sp24,
    paddingTop: Platform.OS === "ios" ? 72 : 56,
    paddingBottom: T.sp40,
  },

  /* Brand */
  brandBlock: {
    alignItems: "center",
    marginBottom: T.sp32,
  },

  logoText: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.navy ?? T.textPrimary,
    letterSpacing: -0.5,
  },

  logoO: {
    color: colors.primary,
  },

  brandSubtitle: {
    marginTop: T.sp8,
    fontSize: 14,
    color: T.textMuted,
  },

  /* Biometric Quick Login */
  biometricLoginButton: {
    marginBottom: T.sp20,
    paddingVertical: 14,
    borderRadius: T.radiusMd,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    backgroundColor: "#F5F3FF",
  },

  biometricLoginText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },

  /* Form */
  formArea: {
    marginBottom: T.sp24,
  },

  field: {
    marginBottom: T.sp16,
  },

  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: T.sp8,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy ?? T.textPrimary,
    marginBottom: T.sp8,
  },

  inlineLink: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  input: {
    height: T.inputH,
    borderRadius: T.radiusMd,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: T.sp16,
    fontSize: 15,
    color: T.textPrimary,
    backgroundColor: T.surface,
  },

  pinInput: {
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
  },

  inputError: {
    borderColor: T.danger,
  },

  fieldError: {
    marginTop: T.sp4,
    fontSize: 12,
    color: T.danger,
    fontWeight: "500",
  },

  /* Error Banner */
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.dangerBg,
    borderColor: T.dangerBorder,
    borderWidth: 1,
    borderRadius: T.radiusMd,
    padding: T.sp12,
    marginBottom: T.sp16,
    gap: T.sp8,
  },

  errorBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: T.danger,
    alignItems: "center",
    justifyContent: "center",
  },

  errorBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: T.dangerText,
    fontWeight: "500",
    lineHeight: 18,
  },

  /* Primary Button */
  primaryButton: {
    height: T.buttonH,
    borderRadius: T.radiusMd,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: T.sp8,
  },

  primaryButtonDisabled: {
    opacity: 0.5,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  /* Biometrics Enrolment Card */
  biometricsCard: {
    backgroundColor: T.surfaceMuted,
    borderRadius: T.radiusLg,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
  },

  biometricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp16,
  },

  biometricsText: {
    flex: 1,
    marginRight: T.sp16,
  },

  biometricsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy ?? T.textPrimary,
    marginBottom: T.sp4,
  },

  biometricsSubtitle: {
    fontSize: 12,
    color: T.textMuted,
    lineHeight: 17,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp8,
    paddingTop: T.sp4,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: T.radiusSm,
    borderWidth: 1.5,
    borderColor: T.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  checkboxLabel: {
    fontSize: 12,
    color: T.textMuted,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: T.sp24,
  },

  modalCard: {
    width: "100%",
    backgroundColor: T.surface,
    borderRadius: T.radiusLg,
    padding: T.sp24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
  },

  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: T.sp16,
  },

  modalIconText: {
    fontSize: 22,
    fontWeight: "800",
    color: T.danger,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.navy ?? T.textPrimary,
    textAlign: "center",
    marginBottom: T.sp8,
  },

  modalMessage: {
    fontSize: 13,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: T.sp20,
  },

  modalButton: {
    width: "100%",
    height: T.buttonH,
    borderRadius: T.radiusMd,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  /* 2FA Flow */
  twoFactorScrollContent: {
    paddingHorizontal: T.sp24,
    paddingTop: Platform.OS === "ios" ? 72 : 56,
    paddingBottom: T.sp40,
  },

  twoFactorCard: {
    backgroundColor: T.surface,
    borderRadius: T.radiusLg,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp20,
  },

  securityIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
    marginBottom: T.sp16,
  },

  securityIcon: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "900",
  },

  twoFactorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy ?? T.textPrimary,
    textAlign: "center",
    marginBottom: T.sp8,
  },

  twoFactorSubtitle: {
    fontSize: 13,
    color: T.textMuted,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: T.sp20,
  },

  setupStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: T.sp16,
  },

  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: T.sp12,
    marginTop: 2,
  },

  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    color: colors.navy ?? T.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: T.sp4,
  },

  stepDescription: {
    color: T.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },

  manualKeyContainer: {
    backgroundColor: T.surfaceMuted,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radiusMd,
    padding: T.sp12,
    marginVertical: T.sp12,
  },

  manualKeyLabel: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: T.sp4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  manualKey: {
    color: colors.navy ?? T.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1.5,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  manualKeyWarning: {
    color: T.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: T.sp8,
  },

  twoFactorInput: {
    height: T.inputH,
    borderRadius: T.radiusMd,
    borderWidth: 1.5,
    borderColor: T.border,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
    backgroundColor: T.surface,
    color: T.textPrimary,
    marginBottom: T.sp8,
  },

  backButton: {
    alignItems: "center",
    marginTop: T.sp16,
    paddingVertical: T.sp8,
  },

  backButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
});
