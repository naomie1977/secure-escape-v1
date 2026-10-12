import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors } from "@/utils/theme";
import { addEmergencyContact } from "@/services/emergencyContactService";
import { completeEnrollment } from "@/services/secureEscapeService";
import { ErrorBanner, ErrorModal } from "@/components/FormErrorMessage";

type LocalContact = {
  id: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
  relationship: string;
  isPrimary: boolean;
};

export default function EmergencyContact() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isOnboarding = from === "onboarding";

  const [contacts, setContacts] = useState<LocalContact[]>([
    {
      id: Date.now().toString(),
      name: "",
      surname: "",
      phone: "",
      email: "",
      relationship: "",
      isPrimary: false,
    },
  ]);

  const [validContactAdded, setValidContactAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const skipScale = useRef(new Animated.Value(1)).current;

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const infoFadeAnim = useRef(new Animated.Value(0)).current;
  const infoScaleAnim = useRef(new Animated.Value(0.9)).current;

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const clearError = () => {
    setError(null);
    setShowErrorModal(false);
  };

  const openInfoModal = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInfoModalVisible(true);

    Animated.parallel([
      Animated.timing(infoFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(infoScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeInfoModal = () => {
    Animated.parallel([
      Animated.timing(infoFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(infoScaleAnim, {
        toValue: 0.9,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => setInfoModalVisible(false));
  };

  const checkValidContacts = (contactsList: LocalContact[]) => {
    const hasValid = contactsList.some(
      (contact) =>
        contact.name.trim() !== "" &&
        contact.surname.trim() !== "" &&
        contact.phone.trim() !== "" &&
        contact.email.trim() !== "",
    );

    setValidContactAdded(hasValid);
    return hasValid;
  };

  const removeContact = (id: string) => {
    if (contacts.length === 1) {
      showError("You need at least one emergency contact slot.");
      return;
    }

    const newContacts = contacts.filter((contact) => contact.id !== id);
    setContacts(newContacts);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    checkValidContacts(newContacts);
  };

  const updateContact = (
    id: string,
    field: keyof LocalContact,
    value: string | boolean,
  ) => {
    const newContacts = contacts.map((contact) =>
      contact.id === id ? { ...contact, [field]: value } : contact,
    );

    setContacts(newContacts);
    clearError();
    checkValidContacts(newContacts);
  };

  const isValidEmail = (email: string) => {
    const trimmedEmail = email.trim();

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  };

  const getValidationMessage = () => {
    const completeContacts = contacts.filter(
      (contact) =>
        contact.name.trim() &&
        contact.surname.trim() &&
        contact.phone.trim() &&
        contact.email.trim(),
    );

    if (completeContacts.length === 0) {
      return "Please fill in at least one complete emergency contact (name, surname, phone number, and email address).";
    }

    for (const contact of completeContacts) {
      const fullName = `${contact.name.trim()} ${contact.surname.trim()}`;

      if (fullName.length > 100) {
        return "Emergency contact full name cannot be more than 100 characters.";
      }

      if (contact.phone.trim().length > 30) {
        return "Emergency contact phone number cannot be more than 30 characters.";
      }

      if (contact.email.trim().length > 254) {
        return "Emergency contact email address cannot be more than 254 characters.";
      }

      if (!isValidEmail(contact.email)) {
        return `Please enter a valid email address for ${fullName}.`;
      }

      if (contact.relationship.trim().length > 50) {
        return "Emergency contact relationship cannot be more than 50 characters.";
      }
    }

    return null;
  };

  const finishAfterSaving = async () => {
    if (isOnboarding) {
      await completeEnrollment();
      router.replace("/secure-escape/congrats");
      return;
    }

    router.replace("/secure-escape/manage-secure-escape");
  };

  const handleAddContact = async () => {
    if (isSaving) {
      return;
    }

    const validationMessage = getValidationMessage();

    if (validationMessage) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );

      showError(validationMessage);
      return;
    }

    try {
      setIsSaving(true);
      clearError();

      const validContacts = contacts.filter(
        (contact) =>
          contact.name.trim() &&
          contact.surname.trim() &&
          contact.phone.trim() &&
          contact.email.trim(),
      );

      for (const contact of validContacts) {
        await addEmergencyContact({
          fullName: `${contact.name.trim()} ${contact.surname.trim()}`,
          phoneNumber: contact.phone.trim(),
          email: contact.email.trim(),
          relationship: contact.relationship.trim(),
          isPrimary: contact.isPrimary,
          notifyOnDuress: true,
        });
      }

      await finishAfterSaving();

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    } catch (err) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );

      showError(
        err instanceof Error
          ? err.message
          : "Failed to save your emergency contact.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (isOnboarding || isSaving) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/secure-escape/manage-secure-escape");
  };

  const animateButton = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const addContact = () => {
    if (isSaving) {
      return;
    }

    if (contacts.length >= 5) {
      showError("You can add up to 5 emergency contacts.");
      return;
    }

    const newContact: LocalContact = {
      id: Date.now().toString(),
      name: "",
      surname: "",
      phone: "",
      email: "",
      relationship: "",
      isPrimary: false,
    };

    const newContacts = [...contacts, newContact];
    setContacts(newContacts);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    checkValidContacts(newContacts);
  };

  const importFromContacts = async () => {
    if (isSaving) {
      return;
    }

    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== "granted") {
        showError("Contacts permission is needed to import a contact.");
        return;
      }

      const picked = await Contacts.presentContactPickerAsync();

      if (!picked) {
        return;
      }

      const firstName = picked.firstName?.trim() ?? "";
      const lastName = picked.lastName?.trim() ?? "";
      const phoneNumber =
        picked.phoneNumbers?.[0]?.number?.trim() ?? "";
      const emailAddress =
        picked.emails?.[0]?.email?.trim() ?? "";

      if (!phoneNumber) {
        showError(
          "This contact does not have a phone number. Please choose another contact or enter the number manually.",
        );
        return;
      }

      const firstEmptyIndex = contacts.findIndex(
        (contact) =>
          !contact.name.trim() &&
          !contact.surname.trim() &&
          !contact.phone.trim() &&
          !contact.email.trim(),
      );

      let newContacts: LocalContact[];

      if (firstEmptyIndex !== -1) {
        newContacts = contacts.map((contact, index) =>
          index === firstEmptyIndex
            ? {
                ...contact,
                name: firstName,
                surname: lastName,
                phone: phoneNumber,
                email: emailAddress,
              }
            : contact,
        );
      } else {
        if (contacts.length >= 5) {
          showError("You can add up to 5 emergency contacts.");
          return;
        }

        newContacts = [
          ...contacts,
          {
            id: Date.now().toString(),
            name: firstName,
            surname: lastName,
            phone: phoneNumber,
            email: emailAddress,
            relationship: "",
            isPrimary: false,
          },
        ];
      }

      setContacts(newContacts);

      void Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Light,
      );

      checkValidContacts(newContacts);
      clearError();
    } catch (err) {
      console.error("Failed to import contact:", err);

      showError(
        "Failed to import contact. Please try again or add it manually.",
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={["#5B8DEF", "#6C63FF"]}
        style={styles.gradientHeader}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Emergency Contact</Text>
      </LinearGradient>

      <View style={styles.whiteCard}>
        <Text style={styles.mainTitle}>
          Add a Safety Contact
        </Text>

        <Text style={styles.sub}>
          {isOnboarding
            ? "Add at least one trusted contact to complete your Secure Escape setup."
            : "Add someone you trust who can be notified when your duress PIN is used."}
        </Text>

        <TouchableOpacity
          onPress={openInfoModal}
          disabled={isSaving}
        >
          <Text style={styles.link}>
            Why add a safety contact?
          </Text>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={colors.primary}
            style={styles.noteIcon}
          />

          <Text style={styles.noteText}>
            <Text style={styles.boldText}>
              Only add someone you trust completely
            </Text>
            {" — "}
            this contact may receive a notification when a duress
            incident is triggered.
          </Text>
        </View>

        {contacts.map((contact, index) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactTitle}>
                Contact {index + 1}
              </Text>

              {contacts.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeContact(contact.id)}
                  style={styles.deleteButton}
                  disabled={isSaving}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={contact.name}
                onChangeText={(text) =>
                  updateContact(contact.id, "name", text)
                }
                maxLength={50}
                placeholder="First name"
                placeholderTextColor="#aaa"
                editable={!isSaving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Surname</Text>
              <TextInput
                style={styles.input}
                value={contact.surname}
                onChangeText={(text) =>
                  updateContact(contact.id, "surname", text)
                }
                maxLength={50}
                placeholder="Last name"
                placeholderTextColor="#aaa"
                editable={!isSaving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={contact.phone}
                onChangeText={(text) =>
                  updateContact(contact.id, "phone", text)
                }
                maxLength={30}
                keyboardType="phone-pad"
                placeholder="+27 XX XXX XXXX"
                placeholderTextColor="#aaa"
                editable={!isSaving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={contact.email}
                onChangeText={(text) =>
                  updateContact(contact.id, "email", text)
                }
                maxLength={254}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="name@example.com"
                placeholderTextColor="#aaa"
                editable={!isSaving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Relationship</Text>
              <TextInput
                style={styles.input}
                value={contact.relationship}
                onChangeText={(text) =>
                  updateContact(
                    contact.id,
                    "relationship",
                    text,
                  )
                }
                maxLength={50}
                placeholder="e.g. Mother, Friend"
                placeholderTextColor="#aaa"
                editable={!isSaving}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryRow}
              onPress={() =>
                updateContact(
                  contact.id,
                  "isPrimary",
                  !contact.isPrimary,
                )
              }
              disabled={isSaving}
            >
              <View
                style={[
                  styles.checkbox,
                  contact.isPrimary && styles.checked,
                ]}
              >
                {contact.isPrimary && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#fff"
                  />
                )}
              </View>

              <Text style={styles.checkLabel}>
                Set as primary contact
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.importButton}
          onPress={importFromContacts}
          disabled={isSaving}
        >
          <Ionicons
            name="phone-portrait-outline"
            size={22}
            color={colors.primary}
          />

          <Text style={styles.importButtonText}>
            Import from Contacts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={addContact}
          disabled={isSaving}
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color={colors.primary}
          />

          <Text style={styles.addButtonText}>
            Add Another Contact
          </Text>
        </TouchableOpacity>

        <ErrorBanner
          message={error}
          onPress={() => setShowErrorModal(true)}
        />

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[
              styles.actionButtonWrapper,
              (!validContactAdded || isSaving) &&
                styles.disabledWrapper,
            ]}
            onPress={() => {
              if (validContactAdded && !isSaving) {
                animateButton(buttonScale);
                void handleAddContact();
              } else if (!isSaving) {
                void Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
              }
            }}
            disabled={!validContactAdded || isSaving}
            activeOpacity={0.8}
          >
            <Animated.View
              style={{
                transform: [{ scale: buttonScale }],
                width: "100%",
              }}
            >
              <LinearGradient
                colors={
                  validContactAdded && !isSaving
                    ? ["#25145F", "#25145F"]
                    : ["#ccc", "#ccc"]
                }
                style={styles.gradientButton}
              >
                {isSaving ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                    />

                    <Text style={styles.buttonText}>
                      {isOnboarding
                        ? "Activating..."
                        : "Saving..."}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>
                    {isOnboarding
                      ? "Complete Setup"
                      : "Add Contact"}
                  </Text>
                )}
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          {!isOnboarding && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                animateButton(skipScale);
                handleSkip();
              }}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Animated.View
                style={{
                  transform: [{ scale: skipScale }],
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text style={styles.skipButtonText}>
                  Cancel
                </Text>
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ErrorModal
        title="Emergency contact"
        message={error}
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
      />

      <Modal
        transparent
        visible={infoModalVisible}
        animationType="none"
        onRequestClose={closeInfoModal}
      >
        <TouchableWithoutFeedback onPress={closeInfoModal}>
          <Animated.View
            style={[
              styles.modalOverlay,
              { opacity: infoFadeAnim },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalCard,
                  {
                    transform: [
                      { scale: infoScaleAnim },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeInfoModal}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.navy}
                  />
                </TouchableOpacity>

                <Text style={styles.modalTitle}>
                  Why add a safety contact?
                </Text>

                <View style={styles.bulletList}>
                  <InfoItem text="A trusted contact can be notified when your duress PIN triggers a Secure Escape incident." />

                  <InfoItem text="When location information is available for the incident, it can help the Secure Escape response workflow." />

                  <InfoItem text="The banking experience remains discreet while the duress response runs in the background." />

                  <InfoItem text="You can manage your emergency contacts later through Secure Escape settings." />
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

function InfoItem({ text }: { text: string }) {
  return (
    <View style={styles.bulletItem}>
      <Ionicons
        name="checkmark-circle"
        size={20}
        color={colors.primary}
      />

      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },

  gradientHeader: {
    paddingTop: 65,
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },

  whiteCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    marginTop: -16,
  },

  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 6,
  },

  sub: {
    fontSize: 14,
    color: colors.textSub,
    marginBottom: 4,
    lineHeight: 20,
  },

  link: {
    fontSize: 13,
    color: colors.primary,
    textDecorationLine: "underline",
    marginVertical: 8,
  },

  noteBox: {
    flexDirection: "row",
    backgroundColor: "#F5F3FF",
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },

  noteIcon: {
    marginRight: 10,
    marginTop: 1,
  },

  noteText: {
    fontSize: 13,
    color: "#444",
    lineHeight: 20,
    flex: 1,
  },

  boldText: {
    fontWeight: "700",
  },

  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.greyLine,
    borderRadius: 5,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  checked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  checkLabel: {
    fontSize: 13,
    color: colors.textSub,
  },

  contactCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.greyLine,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },

  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  contactTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },

  deleteButton: {
    padding: 4,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1.5,
    borderColor: colors.greyLine,
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
  },

  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#F0EFFF",
    borderRadius: 40,
  },

  importButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 40,
    borderStyle: "dashed",
  },

  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },

  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },

  skipButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  skipButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  actionButtonWrapper: {
    flex: 2,
    borderRadius: 50,
    overflow: "hidden",
  },

  disabledWrapper: {
    opacity: 0.6,
  },

  gradientButton: {
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },

  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 14,
    letterSpacing: 0.5,
  },

  bulletList: {
    marginBottom: 8,
  },

  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  bulletText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
  },
});