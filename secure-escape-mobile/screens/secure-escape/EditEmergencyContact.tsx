import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { updateEmergencyContact } from "@/services/emergencyContactService";
import { colors } from "@/utils/theme";

export default function EditEmergencyContact() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string;
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    relationship?: string;
    isPrimary?: string;
  }>();

  const [fullName, setFullName] = useState(params.fullName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(
    params.phoneNumber ?? "",
  );
  const [email, setEmail] = useState(params.email ?? "");
  const [relationship, setRelationship] = useState(
    params.relationship ?? "",
  );
  const [isPrimary, setIsPrimary] = useState(
    params.isPrimary === "true",
  );
  const [isSaving, setIsSaving] = useState(false);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSave = async () => {
    if (!params.id) {
      Alert.alert(
        "Unable to edit contact",
        "This emergency contact could not be identified.",
      );
      return;
    }

    if (!fullName.trim()) {
      Alert.alert(
        "Name required",
        "Please enter the emergency contact's full name.",
      );
      return;
    }

    if (fullName.trim().length > 100) {
      Alert.alert(
        "Name too long",
        "The emergency contact's full name cannot be more than 100 characters.",
      );
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert(
        "Phone number required",
        "Please enter the emergency contact's phone number.",
      );
      return;
    }

    if (phoneNumber.trim().length > 30) {
      Alert.alert(
        "Phone number too long",
        "The emergency contact's phone number cannot be more than 30 characters.",
      );
      return;
    }

    if (!email.trim()) {
      Alert.alert(
        "Email address required",
        "Please enter the emergency contact's email address.",
      );
      return;
    }

    if (email.trim().length > 254) {
      Alert.alert(
        "Email address too long",
        "The emergency contact's email address cannot be more than 254 characters.",
      );
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert(
        "Invalid email address",
        "Please enter a valid emergency contact email address.",
      );
      return;
    }

    if (relationship.trim().length > 50) {
      Alert.alert(
        "Relationship too long",
        "The relationship cannot be more than 50 characters.",
      );
      return;
    }

    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      await updateEmergencyContact(params.id, {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        relationship: relationship.trim(),
        isPrimary,
        notifyOnDuress: true,
      });

      Alert.alert(
        "Contact updated",
        "Your emergency contact has been updated successfully.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace(
                "/secure-escape/manage-secure-escape",
              ),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Unable to update contact",
        error instanceof Error
          ? error.message
          : "Failed to update your emergency contact.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#5B8DEF", "#6C63FF"]}
        style={styles.gradientHeader}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Edit Emergency Contact
        </Text>
      </LinearGradient>

      <View style={styles.whiteCard}>
        <Text style={styles.title}>
          Emergency Contact
        </Text>

        <Text style={styles.subtitle}>
          Update the details for this emergency contact.
        </Text>

        <Text style={styles.label}>Full Name</Text>

        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full name"
          placeholderTextColor={colors.textSub}
          maxLength={100}
          editable={!isSaving}
        />

        <Text style={styles.label}>Phone Number</Text>

        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Phone number"
          placeholderTextColor={colors.textSub}
          keyboardType="phone-pad"
          maxLength={30}
          editable={!isSaving}
        />

        <Text style={styles.label}>Email Address</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          placeholderTextColor={colors.textSub}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={254}
          editable={!isSaving}
        />

        <Text style={styles.label}>Relationship</Text>

        <TextInput
          style={styles.input}
          value={relationship}
          onChangeText={setRelationship}
          placeholder="e.g. Parent, sibling, friend"
          placeholderTextColor={colors.textSub}
          maxLength={50}
          editable={!isSaving}
        />

        <TouchableOpacity
          style={styles.primaryRow}
          onPress={() => setIsPrimary((current) => !current)}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Ionicons
            name={
              isPrimary
                ? "checkbox"
                : "square-outline"
            }
            size={24}
            color={colors.primary}
          />

          <View style={styles.primaryTextContainer}>
            <Text style={styles.primaryLabel}>
              Primary emergency contact
            </Text>

            <Text style={styles.primaryDescription}>
              Make this the main contact for Secure Escape.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaving && styles.saveButtonDisabled,
          ]}
          onPress={() => void handleSave()}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />

              <Text style={styles.saveButtonText}>
                Save Changes
              </Text>
            </>
          )}
        </TouchableOpacity>
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    marginTop: -20,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 28,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.navy,
    marginBottom: 20,
  },

  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.greyLine,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    marginBottom: 28,
  },

  primaryTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  primaryLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },

  primaryDescription: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 3,
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});