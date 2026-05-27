import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { AlertProvider } from "@/src/components/StyledAlert";
import { requestNotificationPermissions } from "@/src/lib/notifications";
import { setupNotificationListeners } from "@/src/lib/notificationListeners";
import { useNotifications } from "@/src/hooks/useNotifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, AppStateStatus, Platform, View } from "react-native";
import "react-native-reanimated";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const { refreshNotifications } = useNotifications(user?.id);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (Platform.OS === "web" || !user) return;

    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("[AppState] App came to foreground, refreshing notifications");
        refreshNotifications();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [user, refreshNotifications]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return setupNotificationListeners();
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#003D66" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      requestNotificationPermissions();
    }
  }, []);

  return (
    <AuthProvider>
      <AlertProvider>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </AlertProvider>
    </AuthProvider>
  );
}
