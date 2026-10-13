import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors } from "@/utils/theme";
import {
  deleteEmergencyContact,
  getEmergencyContacts,
} from "@/services/emergencyContactService";
import {
  getEnrollmentStatus,
  SecureEscapeEnrollment,
} from "@/services/secureEscapeService";
import { EmergencyContactResponse } from "@/types/emergencyContact";

export default function ManageSecureEscape() {
  const router = useRouter();

  const [contacts, setContacts] = useState<EmergencyContactResponse[]>([]);
  const [enrollment, setEnrollment] =
    useState<SecureEscapeEnrollment | null>(null);

  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setStatusError(null);

    try {
      const [contactsResult, enrollmentResult] = await Promise.allSettled([
        getEmergencyContacts(),
        getEnrollmentStatus(),
      ]);

      if (contactsResult.status === "fulfilled") {
        setContacts(contactsResult.value);
      } else {
        console.error(
          "Failed to load contacts:",
          contactsResult.reason,
        );
      }

      if (enrollmentResult.status === "fulfilled") {
        setEnrollment(enrollmentResult.value);
      } else {
        console.error(
          "Failed to load enrollment status:",
          enrollmentResult.reason,
        );

        setStatusError(
          enrollmentResult.reason instanceof Error
            ? enrollmentResult.reason.message
            : "Unable to verify Secure Escape status.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contact: EmergencyContactResponse) => {
    router.push({
      pathname: "/secure-escape/edit-emergency-contact",
      params: {
        id: contact.id,
        fullName: contact.fullName,
        phoneNumber: contact.phoneNumber,
        email: contact.email ?? "",
        relationship: contact.relationship ?? "",
        isPrimary: String(contact.isPrimary),
      },
    });
  };

  const deleteContact = async (contact: EmergencyContactResponse) => {
    if (deletingId) {
      return;
    }

    try {
      setDeletingId(contact.id);

      await deleteEmergencyContact(contact.id);
      await loadData();
    } catch (error) {
      Alert.alert(
        "Unable to delete contact",
        error instanceof Error
          ? error.message
          : "Failed to delete emergency contact.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (contact: EmergencyContactResponse) => {
    Alert.alert(
      "Delete emergency contact?",
      `Are you sure you want to remove ${contact.fullName} from your emergency contacts?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteContact(contact),
        },
      ],
    );
  };

  const isActive = enrollment?.status === "Active";
  const isSetupInProgress =
    enrollment?.status === "SetupInProgress";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#25145F", "#25145F"]}
        style={styles.gradientHeader}
      >
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/settings")}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Secure Escape
        </Text>
      </LinearGradient>

      <View style={styles.whiteCard}>
        {loading ? (
          <View style={styles.statusLoading}>
            <ActivityIndicator color={colors.primary} />

            <Text style={styles.statusLoadingText}>
              Checking Secure Escape status...
            </Text>
          </View>
        ) : statusError ? (
          <View style={styles.warningBadge}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color="#B45309"
            />

            <Text style={styles.warningText}>
              Secure Escape status unavailable
            </Text>
          </View>
        ) : isActive ? (
          <View style={styles.activeBadge}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color="#10B981"
            />

            <Text style={styles.activeText}>
              Secure Escape Active
            </Text>
          </View>
        ) : isSetupInProgress ? (
          <View style={styles.warningBadge}>
            <Ionicons
              name="time-outline"
              size={16}
              color="#B45309"
            />

            <Text style={styles.warningText}>
              Setup In Progress
            </Text>
          </View>
        ) : (
          <View style={styles.warningBadge}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color="#B45309"
            />

            <Text style={styles.warningText}>
              Secure Escape Not Configured
            </Text>
          </View>
        )}

        <Text style={styles.mainTitle}>
          Manage Secure Escape
        </Text>

        <Text style={styles.sub}>
          {isActive
            ? "Secure Escape is active for this account. Manage your emergency contacts and protection settings here."
            : isSetupInProgress
              ? "Secure Escape setup has been started but is not yet complete."
              : "Secure Escape has not been configured for this account."}
        </Text>

        {statusError ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadData()}
          >
            <Text style={styles.retryText}>
              Retry Status Check
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Emergency Contacts
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push(
                "/secure-escape/emergency-contact?from=manage",
              )
            }
          >
            <Text style={styles.addLink}>
              + Add Contact
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            style={styles.contactsLoading}
          />
        ) : contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="people-outline"
              size={40}
              color={colors.greyLine}
            />

            <Text style={styles.emptyText}>
              No emergency contacts added yet
            </Text>

            <Text style={styles.emptySubText}>
              Add an emergency contact as part of your Secure Escape
              protection setup.
            </Text>
          </View>
        ) : (
          contacts.map((contact) => {
            const isDeleting = deletingId === contact.id;

            return (
              <View
                key={contact.id}
                style={styles.contactCard}
              >
                <View style={styles.contactRow}>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text style={styles.contactName}>
                        {contact.fullName}
                      </Text>

                      {contact.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryText}>
                            Primary
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.contactPhone}>
                      {contact.phoneNumber}
                    </Text>

                    {contact.email ? (
                      <Text style={styles.contactEmail}>
                        {contact.email}
                      </Text>
                    ) : (
                      <Text style={styles.emailMissing}>
                        Email address not added
                      </Text>
                    )}

                    {contact.relationship ? (
                      <Text style={styles.contactRelationship}>
                        {contact.relationship}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(contact)}
                      disabled={Boolean(deletingId)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="create-outline"
                        size={19}
                        color={colors.primary}
                      />

                      <Text style={styles.editText}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDelete(contact)}
                      style={styles.deleteButton}
                      disabled={Boolean(deletingId)}
                      activeOpacity={0.7}
                    >
                      {isDeleting ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.danger ?? "#EF4444"}
                        />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={colors.danger ?? "#EF4444"}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

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
    marginTop: -20,
  },

  statusLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },

  statusLoadingText: {
    fontSize: 13,
    color: colors.textSub,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },

  activeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10B981",
  },

  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },

  warningText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B45309",
  },

  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 8,
  },

  sub: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 20,
  },

  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    marginBottom: 20,
  },

  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },

  addLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },

  contactsLoading: {
    marginTop: 40,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },

  emptySubText: {
    fontSize: 12,
    color: colors.textSub,
    textAlign: "center",
    maxWidth: "80%",
    lineHeight: 18,
  },

  contactCard: {
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  contactInfo: {
    flex: 1,
    paddingRight: 12,
  },

  contactNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },

  contactName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },

  primaryBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  primaryText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },

  contactPhone: {
    fontSize: 13,
    color: colors.textSub,
  },

  contactEmail: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 2,
  },

  emailMissing: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 2,
    fontWeight: "600",
  },

  contactRelationship: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 2,
  },

  contactActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
  },

  editText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },

  deleteButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
});