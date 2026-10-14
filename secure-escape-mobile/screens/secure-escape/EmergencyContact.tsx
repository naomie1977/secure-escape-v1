
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// SDK 57 exposes the existing contact picker API through the legacy entry point.
import * as Contacts from "expo-contacts/legacy";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/utils/theme";
import { addEmergencyContact } from "@/services/emergencyContactService";
import { completeEnrollment } from "@/services/secureEscapeService";
import {
  ErrorBanner,
  ErrorModal,
} from "@/components/FormErrorMessage";

const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const BACKGROUND = "#F7F6FB";
const LINE = "#E8E6F0";
const PALE_PURPLE = "#EFEBFC";
const MUTED_PURPLE = "#DCD5F5";
const RED = "#C23B49";

const MAX_CONTACTS = 5;

type LocalContact = {
  id: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
  relationship: string;
  isPrimary: boolean;
};

interface ContactPhoneNumber {
  number?: string;
}

interface ContactEmail {
  email?: string;
}

let nextContactId = 0;

const createContact = (
  values: Partial<LocalContact> = {}
): LocalContact => ({
  id: `contact-${Date.now()}-${++nextContactId}`,
  name: "",
  surname: "",
  phone: "",
  email: "",
  relationship: "",
  isPrimary: false,
  ...values,
});

const isEmptyContact = (contact: LocalContact) =>
  !contact.name.trim() &&
  !contact.surname.trim() &&
  !contact.phone.trim() &&
  !contact.email.trim() &&
  !contact.relationship.trim();

const isCompleteContact = (contact: LocalContact) =>
  !!contact.name.trim() &&
  !!contact.surname.trim() &&
  !!contact.phone.trim() &&
  !!contact.email.trim();

export default function EmergencyContact() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { from } = useLocalSearchParams<{
    from?: string;
  }>();

  const [contacts, setContacts] = useState<
    LocalContact[]
  >([]);

  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const [error, setError] = useState<string | null>(
    null
  );
  const [showErrorModal, setShowErrorModal] =
    useState(false);
  const [infoModalVisible, setInfoModalVisible] =
    useState(false);

  // Prevent repeated submissions and duplicate saves
  // if a request fails partway through multiple contacts.
  const busyRef = useRef(false);
  const savedContactIds = useRef<Set<string>>(
    new Set()
  );

  const isBusy =
    isImporting || isSaving || isSkipping;

  const hasContacts = contacts.length > 0;
  const canAddMore = contacts.length < MAX_CONTACTS;

  const showError = (message: string) => {
    setError(message);
    setShowErrorModal(true);
  };

  const clearError = () => {
    setError(null);
    setShowErrorModal(false);
  };

  const goToNextScreen = () => {
    if (from === "onboarding") {
      router.push("/secure-escape/congrats");
    } else {
      router.push(
        "/secure-escape/manage-secure-escape"
      );
    }
  };

  const finishOnboarding = async () => {
    if (from === "onboarding") {
      await completeEnrollment();
    }

    goToNextScreen();
  };

  const addManualContact = () => {
    if (isBusy) return;

    if (!canAddMore) {
      showError(
        "You can add up to 5 emergency contacts."
      );
      return;
    }

    setContacts((current) => [
      ...current,
      createContact({
        isPrimary: current.length === 0,
      }),
    ]);

    clearError();

    void Haptics.selectionAsync().catch(() => {});
  };

  const importFromContacts = async () => {
    if (isBusy) return;

    if (!canAddMore) {
      showError(
        "You can add up to 5 emergency contacts."
      );
      return;
    }

    try {
      setIsImporting(true);
      clearError();

      const permission =
        await Contacts.requestPermissionsAsync();

      if (permission.status !== "granted") {
        showError(
          "Contacts permission is needed to import a contact."
        );
        return;
      }

      const picked =
        await Contacts.presentContactPickerAsync();

      if (!picked) return;

      const firstName =
        picked.firstName?.trim() ?? "";

      const lastName =
        picked.lastName?.trim() ?? "";

      const displayName =
        picked.name?.trim() ?? "";

      // Some phone contacts have only one display name.
      // Keep it editable rather than losing the name.
      const name =
        firstName ||
        (lastName ? "" : displayName);

      const surname = lastName;

      const phone =
        picked.phoneNumbers?.find(
          (item: ContactPhoneNumber) =>
            !!item.number?.trim()
        )?.number?.trim() ?? "";

      const email =
        picked.emails?.find(
          (item: ContactEmail) =>
            !!item.email?.trim()
        )?.email?.trim() ?? "";

      const newContact = createContact({
        name,
        surname,
        phone,
        email,
        isPrimary: contacts.length === 0,
      });

      setContacts((current) => {
        // Fill a completely empty manual card first.
        const emptyIndex = current.findIndex(
          isEmptyContact
        );

        if (emptyIndex !== -1) {
          return current.map((contact, index) =>
            index === emptyIndex
              ? {
                  ...newContact,
                  id: contact.id,
                  isPrimary: contact.isPrimary,
                }
              : contact
          );
        }

        if (current.length >= MAX_CONTACTS) {
          return current;
        }

        return [
          ...current,
          {
            ...newContact,
            isPrimary:
              current.length === 0,
          },
        ];
      });

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    } catch {
      showError(
        "Failed to import contact. Please try adding it manually."
      );
    } finally {
      setIsImporting(false);
    }
  };

  const updateContact = (
    id: string,
    field:
      | "name"
      | "surname"
      | "phone"
      | "email"
      | "relationship",
    value: string
  ) => {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              [field]: value,
            }
          : contact
      )
    );

    clearError();
  };

  const selectPrimary = (id: string) => {
    setContacts((current) =>
      current.map((contact) => ({
        ...contact,
        isPrimary: contact.id === id,
      }))
    );

    void Haptics.selectionAsync().catch(() => {});
  };

  const removeContact = (id: string) => {
    if (isBusy) return;

    setContacts((current) => {
      const remaining = current.filter(
        (contact) => contact.id !== id
      );

      if (
        remaining.length > 0 &&
        !remaining.some(
          (contact) => contact.isPrimary
        )
      ) {
        return remaining.map(
          (contact, index) => ({
            ...contact,
            isPrimary: index === 0,
          })
        );
      }

      return remaining;
    });

    clearError();
    void Haptics.selectionAsync().catch(() => {});
  };

  const getValidationMessage = () => {
    if (contacts.length === 0) {
      return "Please add an emergency contact or skip this step.";
    }

    for (let index = 0; index < contacts.length; index++) {
      const contact = contacts[index];

      if (!isCompleteContact(contact)) {
        return `Please complete the name, surname, phone number, and email address for Contact ${
          index + 1
        }, or remove that contact.`;
      }

      const fullName =
        `${contact.name.trim()} ${contact.surname.trim()}`;

      if (fullName.length > 100) {
        return "Emergency contact full name cannot be more than 100 characters.";
      }

      if (contact.phone.trim().length > 30) {
        return "Emergency contact phone number cannot be more than 30 characters.";
      }

      if (!contact.email.includes("@") || !contact.email.includes(".")) {
        return `Please enter a valid email address for Contact ${index + 1}.`;
      }

      if (contact.email.trim().length > 254) {
        return "Emergency contact email cannot be more than 254 characters.";
      }

      if (
        contact.relationship.trim().length > 50
      ) {
        return "Emergency contact relationship cannot be more than 50 characters.";
      }
    }

    return null;
  };

  const handleSaveContacts = async () => {
    if (busyRef.current) return;

    const validationMessage =
      getValidationMessage();

    if (validationMessage) {
      showError(validationMessage);

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});

      return;
    }

    busyRef.current = true;
    setIsSaving(true);
    clearError();

    try {
      for (const contact of contacts) {
        if (
          savedContactIds.current.has(contact.id)
        ) {
          continue;
        }

        await addEmergencyContact({
          fullName:
            `${contact.name.trim()} ${contact.surname.trim()}`,
          phoneNumber: contact.phone.trim(),
          email: contact.email.trim(),
          relationship:
            contact.relationship.trim() || "Emergency Contact",
          isPrimary: contact.isPrimary,
          notifyOnDuress: true,
        });

        savedContactIds.current.add(
          contact.id
        );
      }

      await finishOnboarding();

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to save contacts."
      );

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
    } finally {
      busyRef.current = false;
      setIsSaving(false);
    }
  };

  const performSkip = async () => {
    if (busyRef.current) return;

    busyRef.current = true;
    setIsSkipping(true);
    clearError();

    try {
      // Skipping contacts must still finish onboarding.
      await finishOnboarding();

      void Haptics.selectionAsync().catch(() => {});
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Could not finish Secure Escape setup. Please try again."
      );
    } finally {
      busyRef.current = false;
      setIsSkipping(false);
    }
  };

  const handleSkip = () => {
    if (isBusy) return;

    if (contacts.length === 0) {
      void performSkip();
      return;
    }

    Alert.alert(
      "Skip emergency contacts?",
      "Your unsaved contact details will not be added. You can add a safety contact later.",
      [
        {
          text: "Keep editing",
          style: "cancel",
        },
        {
          text: "Skip for now",
          onPress: () => {
            void performSkip();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
      />

      {/* ONBOARDING HEADER */}

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 4,
          },
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

        <View style={styles.headerContent}>
          <View style={styles.stepRow}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>
                STEP 04
              </Text>
            </View>

            <Text style={styles.stepCaption}>
              PROTECTION SETUP
            </Text>
          </View>

          <Text style={styles.headerTitle}>
            Add a safety contact
          </Text>

          <Text style={styles.headerDescription}>
            If you ever use your duress PIN, we
            can silently notify someone you trust —
            without alerting the attacker.
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.contentArea}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* HELP */}

          <TouchableOpacity
            style={styles.helpLink}
            onPress={() =>
              setInfoModalVisible(true)
            }
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={PURPLE}
            />

            <Text style={styles.helpLinkText}>
              Why add a safety contact?
            </Text>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={PURPLE}
            />
          </TouchableOpacity>

          {/* TRUST NOTE */}

          <View style={styles.noticeCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color={PURPLE}
            />

            <Text style={styles.noticeText}>
              <Text style={styles.noticeBold}>
                Only add someone you trust completely
              </Text>
              {" — "}
              they will be notified in an emergency.
            </Text>
          </View>

          {/* PRIMARY IMPORT ACTION */}

          <TouchableOpacity
            style={[
              styles.importCard,
              isBusy && styles.disabledAction,
            ]}
            onPress={importFromContacts}
            disabled={isBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Import from Contacts"
          >
            <View style={styles.importIcon}>
              <Ionicons
                name="people-outline"
                size={25}
                color={WHITE}
              />
            </View>

            <View style={styles.importCopy}>
              <Text style={styles.importTitle}>
                Import from Contacts
              </Text>

              <Text style={styles.importDescription}>
                Choose someone from your phone.
              </Text>
            </View>

            {isImporting ? (
              <ActivityIndicator
                color={WHITE}
                size="small"
              />
            ) : (
              <Ionicons
                name="arrow-forward"
                size={19}
                color={WHITE}
              />
            )}
          </TouchableOpacity>

          {/* SECONDARY MANUAL ACTION */}

          <TouchableOpacity
            style={styles.manualLink}
            onPress={addManualContact}
            disabled={isBusy}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Ionicons
              name="add-circle-outline"
              size={19}
              color={PURPLE}
            />

            <Text style={styles.manualLinkText}>
              Add manually
            </Text>
          </TouchableOpacity>

          {/* CONTACT FORMS APPEAR ON DEMAND */}

          {hasContacts && (
            <View style={styles.contactSection}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>
                  Your safety contacts
                </Text>

                <Text style={styles.sectionCount}>
                  {contacts.length}/{MAX_CONTACTS}
                </Text>
              </View>

              {contacts.map(
                (contact, index) => (
                  <View
                    key={contact.id}
                    style={styles.contactCard}
                  >
                    <View
                      style={styles.contactHeader}
                    >
                      <View
                        style={
                          styles.contactHeaderLeft
                        }
                      >
                        <View
                          style={
                            styles.contactNumber
                          }
                        >
                          <Text
                            style={
                              styles.contactNumberText
                            }
                          >
                            {index + 1}
                          </Text>
                        </View>

                        <View>
                          <Text
                            style={
                              styles.contactTitle
                            }
                          >
                            Contact {index + 1}
                          </Text>

                          <Text
                            style={
                              styles.contactSubtitle
                            }
                          >
                            {contact.isPrimary
                              ? "Primary contact"
                              : "Safety contact"}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() =>
                          removeContact(contact.id)
                        }
                        disabled={isBusy}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove contact ${
                          index + 1
                        }`}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={RED}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.nameRow}>
                      <View
                        style={styles.nameColumn}
                      >
                        <ContactField
                          label="Name"
                          placeholder="First name"
                          value={contact.name}
                          onChangeText={(text) =>
                            updateContact(
                              contact.id,
                              "name",
                              text
                            )
                          }
                          editable={!isBusy}
                          maxLength={50}
                        />
                      </View>

                      <View
                        style={styles.nameColumn}
                      >
                        <ContactField
                          label="Surname"
                          placeholder="Last name"
                          value={contact.surname}
                          onChangeText={(text) =>
                            updateContact(
                              contact.id,
                              "surname",
                              text
                            )
                          }
                          editable={!isBusy}
                          maxLength={50}
                        />
                      </View>
                    </View>

                    <ContactField
                      label="Phone Number"
                      placeholder="+27 XX XXX XXXX"
                      value={contact.phone}
                      onChangeText={(text) =>
                        updateContact(
                          contact.id,
                          "phone",
                          text
                        )
                      }
                      editable={!isBusy}
                      maxLength={30}
                      keyboardType="phone-pad"
                    />

                    <ContactField
                      label="Email Address"
                      placeholder="name@example.com"
                      value={contact.email}
                      onChangeText={(text) =>
                        updateContact(
                          contact.id,
                          "email",
                          text
                        )
                      }
                      editable={!isBusy}
                      maxLength={254}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <ContactField
                      label="Relationship"
                      placeholder="e.g. Mother, Friend"
                      value={contact.relationship}
                      onChangeText={(text) =>
                        updateContact(
                          contact.id,
                          "relationship",
                          text
                        )
                      }
                      editable={!isBusy}
                      maxLength={50}
                    />

                    <TouchableOpacity
                      style={styles.primaryRow}
                      onPress={() =>
                        selectPrimary(contact.id)
                      }
                      disabled={isBusy}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: contact.isPrimary,
                      }}
                    >
                      <Ionicons
                        name={
                          contact.isPrimary
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={20}
                        color={
                          contact.isPrimary
                            ? PURPLE
                            : colors.textSub
                        }
                      />

                      <Text
                        style={styles.primaryText}
                      >
                        Set as primary contact
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              )}

              {!canAddMore && (
                <Text style={styles.limitText}>
                  You can add up to 5 emergency
                  contacts.
                </Text>
              )}
            </View>
          )}

          <ErrorBanner
            message={error}
            onPress={() =>
              setShowErrorModal(true)
            }
          />
        </ScrollView>

        {/* FIXED BOTTOM ACTION */}

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
          {hasContacts && (
            <TouchableOpacity
              style={[
                styles.continueButton,
                isBusy && styles.disabledAction,
              ]}
              onPress={handleSaveContacts}
              disabled={isBusy}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {isSaving ? (
                <ActivityIndicator
                  color={WHITE}
                />
              ) : (
                <>
                  <Text
                    style={
                      styles.continueText
                    }
                  >
                    Save contacts & continue
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={WHITE}
                  />
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isBusy}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            {isSkipping ? (
              <ActivityIndicator
                color={PURPLE}
                size="small"
              />
            ) : (
              <Text style={styles.skipText}>
                Skip for now
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.bottomNote}>
            Next: Complete your Secure Escape setup
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* ERROR MODAL */}

      <ErrorModal
        title="Emergency contact"
        message={error}
        visible={showErrorModal}
        onClose={() =>
          setShowErrorModal(false)
        }
      />

      {/* INFORMATION BOTTOM SHEET */}

      <Modal
        transparent
        visible={infoModalVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() =>
          setInfoModalVisible(false)
        }
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() =>
              setInfoModalVisible(false)
            }
            accessibilityRole="button"
            accessibilityLabel="Close safety contact information"
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
                  name="people-outline"
                  size={21}
                  color={PURPLE}
                />
              </View>

              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>
                  SECURE ESCAPE
                </Text>

                <Text style={styles.modalTitle}>
                  Why add a safety contact?
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() =>
                  setInfoModalVisible(false)
                }
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
              contentContainerStyle={styles.modalContent}
            >
              <InfoPoint>
                Your safety contact will receive a
                silent SMS if your duress PIN is ever
                used. It will include your last known
                location so they can alert authorities
                if needed.
              </InfoPoint>

              <InfoPoint>
                Attackers will see{" "}
                <Text style={styles.bold}>
                  NO indication on your phone
                </Text>
                . The SMS is sent silently in the
                background.
              </InfoPoint>

              <InfoPoint>
                You are in control. You can add,
                change, or remove this contact at
                any time through the app.
              </InfoPoint>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() =>
                  setInfoModalVisible(false)
                }
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

function ContactField({
  label,
  value,
  onChangeText,
  placeholder,
  editable,
  maxLength,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable: boolean;
  maxLength: number;
  keyboardType?: "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A09EAE"
        editable={editable}
        maxLength={maxLength}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={label}
      />
    </View>
  );
}

function InfoPoint({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoPoint}>
      <Ionicons
        name="checkmark-circle-outline"
        size={19}
        color={PURPLE}
        style={styles.infoPointIcon}
      />

      <Text style={styles.infoPointText}>
        {children}
      </Text>
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
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backButton: {
    width: 44,
    height: 42,
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
    paddingTop: 9,
    paddingBottom: 16,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 8,
  },

  stepPill: {
    backgroundColor:
      "rgba(255,255,255,0.14)",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
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
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30,
    color: WHITE,
  },

  headerDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#E4E1FF",
    marginTop: 5,
  },

  // CONTENT

  contentArea: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },

  helpLink: {
    minHeight: 37,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 7,
  },

  helpLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
  },

  // NOTE

  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PALE_PURPLE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 9,
    marginBottom: 15,
  },

  noticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSub,
  },

  noticeBold: {
    fontWeight: "800",
    color: colors.navy,
  },

  // IMPORT

  importCard: {
    minHeight: 92,
    backgroundColor: PURPLE,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 13,
  },

  importIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },

  importCopy: {
    flex: 1,
  },

  importTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: WHITE,
  },

  importDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: "#E4E1FF",
    marginTop: 4,
  },

  disabledAction: {
    opacity: 0.6,
  },

  manualLink: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 7,
  },

  manualLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE,
  },

  // CONTACT SECTION

  contactSection: {
    marginTop: 15,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
  },

  sectionCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSub,
  },

  contactCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
  },

  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  contactHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  contactNumber: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  contactNumberText: {
    fontSize: 13,
    fontWeight: "800",
    color: PURPLE,
  },

  contactTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
  },

  contactSubtitle: {
    fontSize: 10,
    color: colors.textSub,
    marginTop: 2,
  },

  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },

  nameRow: {
    flexDirection: "row",
    gap: 10,
  },

  nameColumn: {
    flex: 1,
    minWidth: 0,
  },

  field: {
    marginBottom: 13,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 6,
  },

  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.navy,
  },

  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 13,
    marginTop: 1,
  },

  primaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },

  limitText: {
    fontSize: 11,
    color: colors.textSub,
    textAlign: "center",
    marginTop: 3,
  },

  // BOTTOM ACTION

  bottomArea: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
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

  continueText: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
  },

  skipButton: {
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
  },

  skipText: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE,
  },

  bottomNote: {
    fontSize: 11,
    color: colors.textSub,
    textAlign: "center",
    marginTop: 1,
  },

  // INFORMATION SHEET

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.52)",
  },

  modalSheet: {
    maxHeight: "86%",
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
    color: colors.textSub,
    letterSpacing: 0.7,
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

  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 19,
    paddingBottom: 24,
  },

  infoPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 17,
  },

  infoPointIcon: {
    marginTop: 1,
  },

  infoPointText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSub,
  },

  bold: {
    fontWeight: "700",
    color: colors.navy,
  },

  modalButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  modalButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: WHITE,
  },
});
