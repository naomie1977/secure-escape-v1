// app/beneficiaries/add-beneficiary-form.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "@/utils/theme";
import { useRouter } from "expo-router";
import { addBeneficiary } from "@/services/beneficiaryService";
import { BeneficiaryResponse } from "@/types/beneficiary";
import VerifyPinModal from "@/components/VerifyPinModal";

// Validation helpers (pure functions, no state)
const validateName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return "Beneficiary name is required";
  if (trimmed.length < 2) return "Minimum 2 characters";
  if (trimmed.length > 25) return "Maximum 25 characters";
  if (!/^[A-Za-z\s\-']+$/.test(trimmed))
    return "Only letters, spaces, hyphens, and apostrophes";
  return "";
};

const validatePhone = (phone: string): string => {
  const trimmed = phone.trim();
  if (!trimmed) return "Cellphone number is required";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 10) return "Must be exactly 10 digits";
  if (!digits.startsWith("0")) return "Must start with 0 (e.g., 0821234567)";
  return "";
};

const validateReference = (ref: string): string => {
  const trimmed = ref.trim();
  if (trimmed.length === 0) return ""; // optional
  if (trimmed.length > 25) return "Maximum 25 characters";
  if (!/^[A-Za-z0-9\s\-_]+$/.test(trimmed))
    return "No special characters allowed";
  return "";
};

export default function AddBeneficiaryForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [oneTime, setOneTime] = useState(false);
  const [notification, setNotification] = useState("None"); // UI only

  // Field errors for real‑time feedback
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [referenceError, setReferenceError] = useState("");

  const [verifyVisible, setVerifyVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [createdBeneficiary, setCreatedBeneficiary] =
    useState<BeneficiaryResponse | null>(null);

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  // Simple validation check without side effects
  const isFormValid = () => {
    return (
      name.trim().length > 0 &&
      phone.trim().length > 0 &&
      !nameError &&
      !phoneError &&
      !referenceError
    );
  };

  // Validate all fields and update errors, return true if all valid
  const validateAll = (): boolean => {
    const nameErr = validateName(name);
    const phoneErr = validatePhone(phone);
    const refErr = validateReference(reference);

    setNameError(nameErr);
    setPhoneError(phoneErr);
    setReferenceError(refErr);

    return !nameErr && !phoneErr && !refErr;
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setNameError(validateName(text));
    if (error) {
      setError(null);
      setShowErrorModal(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    setPhoneError(validatePhone(text));
    if (error) {
      setError(null);
      setShowErrorModal(false);
    }
  };

  const handleReferenceChange = (text: string) => {
    setReference(text);
    setReferenceError(validateReference(text));
    if (error) {
      setError(null);
      setShowErrorModal(false);
    }
  };

  const handleSubmit = () => {
    if (!validateAll()) {
      const err =
        nameError || phoneError || referenceError || "Please correct the highlighted fields.";
      showError(err);
      return;
    }
    setVerifyVisible(true);
  };

  const handleVerifiedSubmit = async () => {
    setVerifyVisible(false);
    try {
      setSaving(true);
      setError(null);

      const digits = phone.replace(/\D/g, "");
      const created = await addBeneficiary({
        name: name.trim(),
        bankName: "Capitec",
        accountNumber: digits,
        reference: reference.trim() || name.trim(),
      });

      setCreatedBeneficiary(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#25145F" />

      {/* Deep-purple app bar */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerCategory}>CAPITEC CELLPHONE</Text>
            <Text style={styles.headerTitle}>Add Beneficiary</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color="#25145F" />
            <Text style={styles.infoText}>
              Pay any registered Capitec client instantly using their 10-digit South African cellphone number.
            </Text>
          </View>

          {/* Beneficiary Name */}
          <Text style={styles.label}>
            Beneficiary Name <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, nameError && styles.inputError]}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Mr M Djonga"
            placeholderTextColor="#94A3B8"
            maxLength={25}
          />
          {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

          {/* Cellphone number */}
          <Text style={[styles.label, { marginTop: 16 }]}>
            Cellphone number <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, phoneError && styles.inputError]}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            placeholder="082 123 4567"
            placeholderTextColor="#94A3B8"
            maxLength={10}
          />
          {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

          {/* Beneficiary Reference */}
          <Text style={[styles.label, { marginTop: 16 }]}>
            Beneficiary Reference
          </Text>
          <TextInput
            style={[styles.input, referenceError && styles.inputError]}
            value={reference}
            onChangeText={handleReferenceChange}
            placeholder="M LEHOKO"
            placeholderTextColor="#94A3B8"
            maxLength={25}
          />
          {!!referenceError && (
            <Text style={styles.errorText}>{referenceError}</Text>
          )}

          {/* One-time beneficiary switch */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchLabel}>One-time beneficiary</Text>
              <Text style={styles.switchSub}>Used for once-off payment only</Text>
            </View>
            <Switch
              value={oneTime}
              onValueChange={setOneTime}
              trackColor={{ false: "#E2E8F0", true: "#25145F" }}
              thumbColor={Platform.OS === "android" ? (oneTime ? "#FFFFFF" : "#F8FAFC") : undefined}
            />
          </View>

          {/* Payment notification (UI only) */}
          <View style={styles.notificationRow}>
            <View>
              <Text style={styles.label}>Payment notification</Text>
              <Text style={styles.switchSub}>Notify recipient upon payment</Text>
            </View>
            <TouchableOpacity style={styles.notificationSelector} activeOpacity={0.8}>
              <Text style={styles.notificationText}>{notification}</Text>
              <Ionicons name="chevron-down" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {error && (
            <TouchableOpacity
              style={styles.errorBanner}
              activeOpacity={0.8}
              onPress={() => setShowErrorModal(true)}
            >
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </TouchableOpacity>
          )}

          {createdBeneficiary ? (
            <View style={styles.successBox}>
              <View style={styles.successHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#166534" />
                <Text style={styles.successTitle}>Beneficiary Saved</Text>
              </View>
              <Text style={styles.successText}>
                {createdBeneficiary.name} is ready for payments.
              </Text>
              <View style={styles.successActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() =>
                    router.replace("/beneficiaries/beneficiary-list")
                  }
                >
                  <Text style={styles.secondaryButtonText}>View List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() =>
                    router.push({
                      pathname: "/transactions/create-transfer",
                      params: {
                        beneficiaryId: createdBeneficiary.id,
                        beneficiaryName: createdBeneficiary.name,
                        reference: createdBeneficiary.reference,
                      },
                    })
                  }
                >
                  <Text style={styles.payButtonText}>Pay Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid() || saving) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid() || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Add Beneficiary</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <VerifyPinModal
        visible={verifyVisible}
        onCancel={() => setVerifyVisible(false)}
        onVerified={handleVerifiedSubmit}
        subtitle="Enter your PIN to add this beneficiary"
      />

      {/* Error Modal */}
      <Modal
        transparent
        visible={showErrorModal && !!error}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModal}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="alert-circle" size={30} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Could not continue</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#25145F",
  },
  header: {
    backgroundColor: "#25145F",
    paddingTop: Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 24) + 12,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitles: {
    alignItems: "center",
  },
  headerCategory: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E9D5FF",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  body: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#25145F",
    lineHeight: 17,
    fontWeight: "500",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginLeft: 4,
    marginTop: 2,
    marginBottom: 6,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    borderRadius: 14,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  switchSub: {
    fontSize: 12,
    color: "#64748B",
  },
  notificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    borderRadius: 14,
  },
  notificationSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  notificationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: "#25145F",
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#25145F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
  },
  errorBannerText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorModal: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  modalMessage: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  modalButton: {
    marginTop: 20,
    width: "100%",
    backgroundColor: "#25145F",
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  successBox: {
    marginTop: 22,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  successHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
  },
  successText: {
    marginTop: 6,
    fontSize: 13,
    color: "#3F6212",
    lineHeight: 18,
  },
  successActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#25145F",
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#25145F",
    fontWeight: "700",
  },
  payButton: {
    flex: 1,
    backgroundColor: "#25145F",
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: "center",
  },
  payButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});