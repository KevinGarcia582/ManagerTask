import { useAuth } from "@/src/context/AuthContext";
import { router } from "expo-router";
import { useEffect } from "react";
import LoginScreen from "@/src/screens/LoginScreen";

export default function LoginPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/(tabs)");
    }
  }, [user, loading]);

  if (loading) {
    return null;
  }

  return <LoginScreen />;
}
