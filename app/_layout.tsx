import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { AlertProvider } from "@/src/components/StyledAlert";
import { requestNotificationPermissions } from "@/src/lib/notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import "react-native-reanimated";

function RootLayoutNav() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#003D66" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
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
