import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, radii, sizing, spacing } from "@/utils/theme";
import {
  createCashSend,
  createTransfer,
  uploadCurrentPhotoEvidence,
} from "@/services/transactionServices";
import { TransactionResponse } from "@/types/transaction";
import VerifyPinModal from "@/components/VerifyPinModal";
import SuccessModal from "@/components/SuccessModal";

const DEMO_STEPS = [
  "Photo captured",
  "Verifying capture…",
  "Processing security check…",
  "Verification ready",
];

const formatCurrency = (value: number) =>
  `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function SelfieVerification() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    transferType?: string;
    beneficiaryId?: string;
    beneficiaryName?: string;
    recipientName?: string;
    recipientBank?: string;
    recipientAccountNumber?: string;
    recipientAccountType?: string;
    recipientBranchCode?: string;
    reference?: string;
    amount?: string;
    accountId?: string;
    accountName?: string;
    transactionType?: "Transfer" | "CashSend";
    voucherPin?: string;
  }>();

  const isOnceOff = params.transferType === "onceOff";
  const beneficiaryId = params.beneficiaryId || "";
  const beneficiaryName = params.beneficiaryName || "";
  const recipientName = params.recipientName || "";
  const recipientBank = params.recipientBank || "";
  const recipientAccountNumber = params.recipientAccountNumber || "";
  const recipientAccountType = params.recipientAccountType || "";
  const recipientBranchCode = params.recipientBranchCode || "";
  const reference = params.reference || "";
  const amount = parseFloat(params.amount || "0");
  const accountId = params.accountId || "";
  const accountName = params.accountName || "";
  const transactionType = params.transactionType || "Transfer";
  const voucherPin = params.voucherPin || "";

  const payeeName = isOnceOff
    ? recipientName || "Recipient"
    : beneficiaryName || "Beneficiary";

  const [cameraPermission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const scanAnimation = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const scanInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [previewHeight, setPreviewHeight] = useState(340);

  const [verifyVisible, setVerifyVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [createdTransaction, setCreatedTransaction] =
    useState<TransactionResponse | null>(null);

  useEffect(() => {
    return () => {
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
      }
      scanAnimation.current?.stop();
    };
  }, []);

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const clearError = () => {
    setError(null);
    setShowErrorModal(false);
  };

  const startDemoScan = () => {
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
    }
    scanAnimation.current?.stop();

    setScanning(true);
    setScanComplete(false);
    setCurrentStep(0);
    scanAnim.setValue(0);

    scanAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    scanAnimation.current.start();

    let step = 0;

    scanInterval.current = setInterval(() => {
      step += 1;

      if (step < DEMO_STEPS.length) {
        setCurrentStep(step);
        return;
      }

      if (scanInterval.current) {
        clearInterval(scanInterval.current);
        scanInterval.current = undefined;
      }

      scanAnimation.current?.stop();
      setScanning(false);
      setScanComplete(true);
      setCurrentStep(DEMO_STEPS.length - 1);
    }, 600);
  };

  const takeSelfie = async () => {
    if (capturing || scanning || saving) return;

    if (!cameraPermission?.granted) {
      showError("Camera access is required to capture a photo.");
      return;
    }

    if (!cameraRef.current) {
      showError("The camera is not ready. Please try again.");
      return;
    }

    try {
      setCapturing(true);
      clearError();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error("No image was captured.");
      }

      setCapturedImage(photo.uri);
      startDemoScan();
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to capture the image. Please try again."
      );
    } finally {
      setCapturing(false);
    }
  };

  const retakeSelfie = () => {
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = undefined;
    }

    scanAnimation.current?.stop();
    scanAnim.setValue(0);
    setCapturedImage(null);
    setScanning(false);
    setScanComplete(false);
    setCurrentStep(0);
    clearError();
  };

  const handleProceed = () => {
    if (!capturedImage || saving || createdTransaction) {
      return;
    }

    setVerifyVisible(true);
  };

  const handleVerifiedSubmit = async () => {
    if (saving) return;

    setVerifyVisible(false);

    if (!capturedImage) {
      showError("Photo is no longer available. Please retake photo.");
      return;
    }

    try {
      setSaving(true);
      clearError();

      if (transactionType === "CashSend") {
        const cashSend = await createCashSend({
          bankAccountId: accountId,
          amount,
          voucherPin: voucherPin || "",
          description: reference.trim() || "Cash send",
        });

        if (cashSend.status === "Failed" || cashSend.status === "Blocked") {
          showError("This cash send could not be processed.");
          return;
        }

        if (capturedImage && cashSend.transactionId) {
          try {
            await uploadCurrentPhotoEvidence(capturedImage, cashSend.transactionId);
          } catch (uploadErr) {
            console.warn("Evidence upload warning:", uploadErr);
          }
        }

        router.replace("/(tabs)");
        return;
      }

      const transaction = await createTransfer(
        isOnceOff
          ? {
              bankAccountId: accountId,
              beneficiaryId: null,
              recipientName: recipientName.trim(),
              recipientBank: recipientBank.trim(),
              recipientAccountNumber: recipientAccountNumber.trim(),
              recipientAccountType: recipientAccountType.trim(),
              recipientBranchCode: recipientBranchCode.trim(),
              amount,
              description: reference.trim() || "Payment",
            }
          : {
              bankAccountId: accountId,
              beneficiaryId,
              amount,
              description: reference.trim() || "Payment",
            },
      );

      if (
        transaction.status === "Failed" ||
        transaction.status === "Blocked"
      ) {
        showError(
          transaction.statusReason ||
            "This transfer could not be processed.",
        );
        return;
      }

      if (capturedImage) {
        try {
          await uploadCurrentPhotoEvidence(
            capturedImage,
            transaction.id,
          );
        } catch (uploadErr) {
          console.warn("Evidence upload warning:", uploadErr);
        }
      }

      setCreatedTransaction(transaction);
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "The transfer could not be completed. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const scanLineTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      -previewHeight / 2 + 40,
      previewHeight / 2 - 40,
    ],
  });

  const cameraReady = !!cameraPermission?.granted && !capturedImage;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#25145F"
      />

      {/* COMPACT PURPLE HEADER — NO SCROLLING NEEDED */}
      <View style={styles.header}>
        <View style={styles.appBar}>
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
              color={colors.white}
            />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>
            Security Verification
          </Text>

          <View style={styles.appBarSpacer} />
        </View>

        <View style={styles.headerBottom}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color="#E4E1FF"
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerHeading}>
              Confirm Your Presence
            </Text>
            <Text style={styles.headerSubheading}>
              Position your face inside the guide to continue.
            </Text>
          </View>
        </View>
      </View>

      {/* CAMERA SECTION — FILLS AVAILABLE SCREEN HEIGHT ABOVE THE FOLD */}
      <View style={styles.cameraSection}>
        <View
          style={styles.previewContainer}
          onLayout={(event) => {
            setPreviewHeight(event.nativeEvent.layout.height);
          }}
        >
          {cameraPermission?.granted ? (
            <>
              {capturedImage ? (
                <Image
                  source={{ uri: capturedImage }}
                  style={styles.previewImage}
                />
              ) : (
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="front"
                  autofocus="on"
                  animateShutter={false}
                />
              )}

              {scanning && (
                <View
                  style={styles.scanDimmer}
                  pointerEvents="none"
                />
              )}

              {!scanComplete && (
                <View
                  style={styles.faceGuideContainer}
                  pointerEvents="none"
                >
                  <View style={styles.faceGuide} />
                </View>
              )}

              {scanning && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        { translateY: scanLineTranslate },
                      ],
                    },
                  ]}
                />
              )}

              {scanComplete && (
                <View
                  style={styles.completeOverlay}
                  pointerEvents="none"
                >
                  <View style={styles.completeIcon}>
                    <Ionicons
                      name="checkmark"
                      size={28}
                      color={colors.white}
                    />
                  </View>
                  <Text style={styles.completeText}>
                    Photo Verified
                  </Text>
                </View>
              )}

              <View
                style={styles.cameraBadge}
                pointerEvents="none"
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={colors.white}
                />
                <Text style={styles.cameraBadgeText}>
                  SECURITY VERIFICATION
                </Text>
              </View>

              {/* CAPTURE BUTTON OVERLAY */}
              {cameraReady && (
                <TouchableOpacity
                  style={styles.shutterButton}
                  onPress={takeSelfie}
                  disabled={capturing}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Take photo"
                >
                  {capturing ? (
                    <ActivityIndicator
                      color={colors.white}
                    />
                  ) : (
                    <View style={styles.shutterOuter}>
                      <View style={styles.shutterInner} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.permissionState}>
              {!cameraPermission ? (
                <>
                  <ActivityIndicator
                    color={colors.white}
                  />
                  <Text style={styles.permissionTitle}>
                    Loading camera…
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.permissionIcon}>
                    <Ionicons
                      name="camera-outline"
                      size={27}
                      color={colors.white}
                    />
                  </View>

                  <Text style={styles.permissionTitle}>
                    Camera Access Required
                  </Text>

                  <Text style={styles.permissionDescription}>
                    Allow camera access to complete this additional security step.
                  </Text>

                  <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestPermission}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.permissionButtonText}>
                      Allow Camera Access
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </View>

      {/* COMPACT BOTTOM CONTROLS — ALWAYS ACCESSIBLE */}
      <View style={styles.bottomPanel}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIcon,
              scanComplete && styles.statusIconComplete,
            ]}
          >
            <Ionicons
              name={
                scanComplete
                  ? "checkmark"
                  : scanning
                  ? "scan-outline"
                  : "camera-outline"
              }
              size={18}
              color={
                scanComplete
                  ? colors.white
                  : "#25145F"
              }
            />
          </View>

          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {scanComplete
                ? "Photo ready for PIN verification"
                : scanning
                ? DEMO_STEPS[currentStep]
                : capturedImage
                ? "Selfie captured"
                : "Ready to capture"}
            </Text>

            <Text
              style={styles.statusDescription}
              numberOfLines={2}
            >
              {scanComplete
                ? "Your PIN is still required before payment is submitted."
                : scanning
                ? "Processing security verification."
                : "Use the shutter button above to take your photo."}
            </Text>
          </View>

          {scanning && (
            <ActivityIndicator
              color="#25145F"
              size="small"
            />
          )}

          {!!capturedImage &&
            !scanning &&
            !createdTransaction && (
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={retakeSelfie}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Retake selfie"
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color="#25145F"
                />
                <Text style={styles.retakeText}>
                  Retake
                </Text>
              </TouchableOpacity>
            )}
        </View>

        {!!error && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={() => setShowErrorModal(true)}
            accessibilityRole="button"
          >
            <Ionicons
              name="alert-circle-outline"
              size={17}
              color={colors.dangerStrong}
            />
            <Text
              style={styles.errorBannerText}
              numberOfLines={2}
            >
              {error}
            </Text>
          </TouchableOpacity>
        )}

        {!createdTransaction && (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!capturedImage || saving) &&
                styles.disabledButton,
            ]}
            onPress={handleProceed}
            disabled={!capturedImage || saving}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !capturedImage || saving,
              busy: saving,
            }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {scanning
                    ? "Processing scan…"
                    : capturedImage
                    ? "Continue to PIN Verification"
                    : "Take Photo to Continue"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.white}
                />
              </>
            )}
          </TouchableOpacity>
        )}

        <Text
          style={styles.paymentSummary}
          numberOfLines={1}
        >
          {formatCurrency(amount)} to {payeeName}
          {!!accountName ? ` · From ${accountName}` : ""}
        </Text>
      </View>

      {/* PIN VERIFICATION MODAL */}
      <VerifyPinModal
        visible={verifyVisible}
        onCancel={() => setVerifyVisible(false)}
        onVerified={handleVerifiedSubmit}
        subtitle="Enter your PIN to send this transfer"
      />

      {/* SUCCESS MODAL */}
      <SuccessModal
        visible={
          !!createdTransaction &&
          createdTransaction.status !== "Pending"
        }
        title="Payment Submitted"
        message={`You transferred ${formatCurrency(amount)} to ${payeeName}.`}
        details={[
          {
            label: "Reference",
            value: createdTransaction?.bankReference || reference,
          },
          {
            label: "Status",
            value: createdTransaction?.status || "Successful",
          },
        ]}
        primaryLabel="Done"
        onPrimaryPress={() => router.replace("/(tabs)")}
      />

      {/* ERROR MODAL */}
      <Modal
        transparent
        animationType="fade"
        statusBarTranslucent
        visible={showErrorModal && !!error}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModal}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={29}
                color={colors.dangerStrong}
              />
            </View>

            <Text style={styles.feedbackTitle}>
              Verification Notice
            </Text>

            <Text style={styles.feedbackMessage}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowErrorModal(false)}
              accessibilityRole="button"
            >
              <Text style={styles.modalButtonText}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: "#25145F",
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 24) + 6
        : 52,
    paddingBottom: 4,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
  },
  appBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
  },
  appBarSpacer: {
    width: sizing.touchTarget,
  },
  headerBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: 7,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.4,
  },
  headerSubheading: {
    fontSize: 12,
    color: "#E4E1FF",
    marginTop: 2,
  },
  cameraSection: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  previewContainer: {
    flex: 1,
    minHeight: 0,
    borderRadius: 20,
    backgroundColor: "#121326",
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    width: "100%",
    height: "100%",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  scanDimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8,8,20,0.25)",
  },
  faceGuideContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  faceGuide: {
    width: "60%",
    height: "68%",
    maxWidth: 220,
    maxHeight: 270,
    borderRadius: 130,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: spacing.xxl,
    right: spacing.xxl,
    height: 2,
    backgroundColor: "#B5A9FF",
    shadowColor: "#B5A9FF",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  completeOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,13,30,0.5)",
  },
  completeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  completeText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  cameraBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: "rgba(15,15,32,0.65)",
    gap: spacing.xs,
  },
  cameraBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.4,
  },
  shutterButton: {
    position: "absolute",
    bottom: spacing.lg,
    alignSelf: "center",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  permissionState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  permissionIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
  },
  permissionDescription: {
    fontSize: 13,
    color: "#E4E1FF",
    textAlign: "center",
    lineHeight: 19,
  },
  permissionButton: {
    minHeight: 46,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: "#25145F",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  bottomPanel: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 28 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.greyLine,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: "#F4F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconComplete: {
    backgroundColor: "#25145F",
  },
  statusInfo: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  statusDescription: {
    fontSize: 11,
    color: colors.textSub,
    marginTop: 2,
    lineHeight: 15,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F4F0FF",
    gap: 4,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#25145F",
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#25145F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: "#25145F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  paymentSummary: {
    marginTop: spacing.xs,
    textAlign: "center",
    fontSize: 11,
    color: colors.textSub,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.dangerBg,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    color: colors.dangerStrong,
    fontSize: 11,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  feedbackModal: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    alignItems: "center",
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
  },
  feedbackMessage: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 20,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  modalButton: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#25145F",
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xxl,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
