import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";

import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useRef, useState } from "react";
import {
  clearAuthToken,
  getAuthToken,
  isSessionExpired,
  setLastActivityNow,
} from "@/services/tokenStore";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  anchor: "(auth)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const router = useRouter();
  const segments = useSegments();
  const currentSegment = segments[0] ?? "";

  const [isLoading, setIsLoading] = useState(true);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getAuthToken();
        const expired = await isSessionExpired();

        const inAuthGroup = currentSegment === "(auth)";

        if (token && !expired) {
          if (inAuthGroup) {
            router.replace("/(tabs)");
          }
        } else {
          if (token && expired) {
            await clearAuthToken();
          }

          if (!inAuthGroup) {
            router.replace("/(auth)");
          }
        }
      } catch (error) {
        console.log("Authentication error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [currentSegment, router]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        try {
          const previousState = appState.current;
          appState.current = nextAppState;

          const token = await getAuthToken();

          if (!token) {
            return;
          }

          // The customer has left the app or locked/minimized the phone.
          // Record the beginning of the inactivity period.
          if (
            nextAppState === "background" ||
            nextAppState === "inactive"
          ) {
            await setLastActivityNow();
            return;
          }

          // The customer has returned to Secure Escape.
          // Check how long the app was inactive.
          if (
            nextAppState === "active" &&
            (previousState === "background" ||
              previousState === "inactive")
          ) {
            const expired = await isSessionExpired();

            if (expired) {
              await clearAuthToken();
              router.replace("/(auth)");
              return;
            }

            // They returned within the allowed inactivity window.
            // Refresh the activity timestamp for the next inactivity period.
            await setLastActivityNow();
          }
        } catch (error) {
          console.log("Session inactivity check error:", error);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="secure-escape" />
        <Stack.Screen name="beneficiaries" />

        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            title: "Modal",
          }}
        />
      </Stack>

      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

