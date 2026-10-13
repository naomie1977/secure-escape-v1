import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
  Platform,
} from "react-native";
import MapView, {
  Circle,
  Marker,
  PROVIDER_DEFAULT,
  Region,
} from "react-native-maps";
import { colors } from "@/utils/theme";

import {
  AreaSafetyResult,
  checkAreaSafety,
} from "@/services/areaSafetyService";
import { RiskLevel, RiskZone } from "@/services/riskZoneService";

const INITIAL_LATITUDE_DELTA = 0.12;
const INITIAL_LONGITUDE_DELTA = 0.12;

type StatusContent = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "high" | "medium" | "clear";
};

function getStatusContent(result: AreaSafetyResult): StatusContent {
  const zoneName = result.nearestZone?.name;

  switch (result.status) {
    case "inside-high":
      return {
        title: "Higher-risk area",
        description: zoneName
          ? `You are currently within the ${zoneName} safety awareness zone. Stay aware of your surroundings.`
          : "You are currently within a higher-risk safety awareness zone.",
        icon: "warning-outline",
        tone: "high",
      };

    case "inside-medium":
      return {
        title: "Elevated-risk area",
        description: zoneName
          ? `You are currently within the ${zoneName} safety awareness zone. Stay aware of your surroundings.`
          : "You are currently within an elevated-risk safety awareness zone.",
        icon: "alert-circle-outline",
        tone: "medium",
      };

    case "nearby-high":
      return {
        title: "Higher-risk area nearby",
        description: zoneName
          ? `${zoneName} is close to your current location. Stay aware of your surroundings.`
          : "A higher-risk safety awareness zone is close to your current location.",
        icon: "warning-outline",
        tone: "high",
      };

    case "nearby-medium":
      return {
        title: "Elevated-risk area nearby",
        description: zoneName
          ? `${zoneName} is close to your current location. Stay aware of your surroundings.`
          : "An elevated-risk safety awareness zone is close to your current location.",
        icon: "alert-circle-outline",
        tone: "medium",
      };

    default:
      return {
        title: "No elevated-risk areas detected nearby",
        description:
          "There are currently no High or Medium safety awareness zones detected near your location.",
        icon: "shield-checkmark-outline",
        tone: "clear",
      };
  }
}

function getRiskColour(level: RiskLevel): string {
  switch (level) {
    case "High":
      return "#C43D3D";
    case "Medium":
      return "#D58B18";
    case "Low":
      return "#2F7D5A";
  }
}

function getRiskFillColour(level: RiskLevel): string {
  switch (level) {
    case "High":
      return "rgba(196, 61, 61, 0.18)";
    case "Medium":
      return "rgba(213, 139, 24, 0.16)";
    case "Low":
      return "rgba(47, 125, 90, 0.12)";
  }
}

function getStatusColours(tone: StatusContent["tone"]) {
  switch (tone) {
    case "high":
      return {
        background: "#FEF2F2",
        border: "#FECACA",
        iconBackground: "#FEE2E2",
        icon: "#DC2626",
        title: "#991B1B",
      };

    case "medium":
      return {
        background: "#FFFBEB",
        border: "#FED7AA",
        iconBackground: "#FEF3C7",
        icon: "#D97706",
        title: "#92400E",
      };

    default:
      return {
        background: "#F0FDF4",
        border: "#BBF7D0",
        iconBackground: "#DCFCE7",
        icon: "#16A34A",
        title: "#166534",
      };
  }
}

function formatDistance(distanceMeters: number | null): string | null {
  if (distanceMeters === null) {
    return null;
  }

  const safeDistance = Math.max(0, distanceMeters);

  if (safeDistance < 1000) {
    return `${Math.round(safeDistance)} m`;
  }

  return `${(safeDistance / 1000).toFixed(1)} km`;
}

function getZoneDescription(zone: RiskZone): string {
  if (zone.description?.trim()) {
    return zone.description.trim();
  }

  return `${zone.riskLevel} safety awareness zone.`;
}

export default function AreaSafetyScreen() {
  const router = useRouter();

  const [result, setResult] = useState<AreaSafetyResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);

  const loadAreaSafety = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const nextResult = await checkAreaSafety();

      setResult(nextResult);
      setSelectedZone(nextResult.nearestZone);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Area Safety information could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAreaSafety();
    }, [loadAreaSafety]),
  );

  const mapRegion = useMemo<Region | undefined>(() => {
    if (!result) {
      return undefined;
    }

    return {
      latitude: result.currentLocation.latitude,
      longitude: result.currentLocation.longitude,
      latitudeDelta: INITIAL_LATITUDE_DELTA,
      longitudeDelta: INITIAL_LONGITUDE_DELTA,
    };
  }, [result]);

  const statusContent = result ? getStatusContent(result) : null;
  const statusColours = statusContent
    ? getStatusColours(statusContent.tone)
    : null;

  const boundaryDistance = result
    ? formatDistance(result.distanceToNearestZoneBoundaryMeters)
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Area Safety</Text>
          <Text style={styles.headerSubtitle}>Location awareness</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh area safety"
          onPress={loadAreaSafety}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && !isLoading && styles.pressed,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.white} />
          )}
        </Pressable>
      </View>

      {isLoading && !result ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerStateTitle}>Checking your area</Text>
          <Text style={styles.centerStateText}>
            Using your current location to load nearby safety awareness zones.
          </Text>
        </View>
      ) : error && !result ? (
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={colors.dangerStrong}
            />
          </View>

          <Text style={styles.centerStateTitle}>
            Area Safety unavailable
          </Text>

          <Text style={styles.centerStateText}>{error}</Text>

          <Pressable
            onPress={loadAreaSafety}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : result && mapRegion && statusContent && statusColours ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: statusColours.background,
                borderColor: statusColours.border,
              },
            ]}
          >
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: statusColours.iconBackground },
              ]}
            >
              <Ionicons
                name={statusContent.icon}
                size={24}
                color={statusColours.icon}
              />
            </View>

            <View style={styles.statusText}>
              <Text
                style={[
                  styles.statusTitle,
                  { color: statusColours.title },
                ]}
              >
                {statusContent.title}
              </Text>

              <Text style={styles.statusDescription}>
                {statusContent.description}
              </Text>

              {result.nearestZone &&
              result.status !== "clear" &&
              !result.isInsideZone &&
              boundaryDistance ? (
                <Text style={styles.distanceText}>
                  Approximately {boundaryDistance} from the zone boundary
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Safety map</Text>
              <Text style={styles.sectionSubtitle}>
                Your location and configured awareness zones
              </Text>
            </View>

            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Current</Text>
            </View>
          </View>

          <View style={styles.mapCard}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={mapRegion}
              showsUserLocation
              showsMyLocationButton
              showsCompass
              onPress={() => setSelectedZone(null)}
            >
              {result.zones.map((zone) => {
                const colour = getRiskColour(zone.riskLevel);

                return (
                  <React.Fragment key={zone.id}>
                    <Circle
                      center={{
                        latitude: zone.latitude,
                        longitude: zone.longitude,
                      }}
                      radius={zone.radiusMeters}
                      strokeColor={colour}
                      fillColor={getRiskFillColour(zone.riskLevel)}
                      strokeWidth={2}
                    />

                    <Marker
                      coordinate={{
                        latitude: zone.latitude,
                        longitude: zone.longitude,
                      }}
                      title={zone.name}
                      description={`${zone.riskLevel} awareness zone`}
                      pinColor={colour}
                      onPress={() => setSelectedZone(zone)}
                    />
                  </React.Fragment>
                );
              })}
            </MapView>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: getRiskColour("High") },
                  ]}
                />
                <Text style={styles.legendText}>High</Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: getRiskColour("Medium") },
                  ]}
                />
                <Text style={styles.legendText}>Medium</Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: getRiskColour("Low") },
                  ]}
                />
                <Text style={styles.legendText}>Low</Text>
              </View>
            </View>
          </View>

          {selectedZone ? (
            <View style={styles.zoneCard}>
              <View style={styles.zoneHeader}>
                <View style={styles.zoneTitleContainer}>
                  <Text style={styles.zoneName}>{selectedZone.name}</Text>
                  <Text style={styles.zoneDescription}>
                    {getZoneDescription(selectedZone)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.riskBadge,
                    {
                      backgroundColor: getRiskFillColour(
                        selectedZone.riskLevel,
                      ),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.riskBadgeDot,
                      {
                        backgroundColor: getRiskColour(
                          selectedZone.riskLevel,
                        ),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.riskBadgeText,
                      {
                        color: getRiskColour(selectedZone.riskLevel),
                      },
                    ]}
                  >
                    {selectedZone.riskLevel}
                  </Text>
                </View>
              </View>

              <View style={styles.zoneMetaRow}>
                <View style={styles.zoneMetaItem}>
                  <Ionicons
                    name="resize-outline"
                    size={17}
                    color="#5C677D"
                  />
                  <Text style={styles.zoneMetaText}>
                    {formatDistance(selectedZone.radiusMeters)} radius
                  </Text>
                </View>

                {result.nearestZone?.id === selectedZone.id &&
                result.isInsideZone ? (
                  <View style={styles.zoneMetaItem}>
                    <Ionicons
                      name="location"
                      size={17}
                      color={colors.primary}
                    />
                    <Text style={styles.currentZoneText}>
                      Your current zone
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.mapHint}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.textSub}
              />
              <Text style={styles.mapHintText}>
                Tap a zone marker on the map to view its details.
              </Text>
            </View>
          )}

          <View style={styles.guidanceCard}>
            <View style={styles.guidanceIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.guidanceContent}>
              <Text style={styles.guidanceTitle}>
                Stay aware, not alarmed
              </Text>
              <Text style={styles.guidanceText}>
                Area Safety provides location-based awareness using configured
                risk zones. Risk levels are intended to support safer banking
                behaviour and do not guarantee that an area is safe or unsafe.
              </Text>
            </View>
          </View>

          <View style={styles.privacyRow}>
            <Ionicons
              name="location-outline"
              size={18}
              color={colors.textSub}
            />
            <Text style={styles.privacyText}>
              Your current location is checked when Area Safety loads or is
              refreshed. This screen does not display a history of your
              locations.
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  header: {
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 24) + 8
        : 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryDark,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  pressed: {
    opacity: 0.65,
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.white,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#E4E1FF",
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  centerState: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  centerStateTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
  },
  centerStateText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSub,
    textAlign: "center",
  },
  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerBg,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  statusCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#4C5668",
  },
  distanceText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#697386",
  },
  sectionHeading: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSub,
  },
  livePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySubtle,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: colors.primary,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  mapCard: {
    height: 380,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  map: {
    flex: 1,
  },
  legend: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.navy,
  },
  zoneCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  zoneHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  zoneTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },
  zoneDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSub,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  riskBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  zoneMetaRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  zoneMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  zoneMetaText: {
    marginLeft: 6,
    fontSize: 12,
    color: colors.textSub,
  },
  currentZoneText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  mapHint: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapHintText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSub,
  },
  guidanceCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
  },
  guidanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  guidanceContent: {
    flex: 1,
  },
  guidanceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  guidanceText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSub,
  },
  privacyRow: {
    marginTop: 16,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  privacyText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSub,
  },
});