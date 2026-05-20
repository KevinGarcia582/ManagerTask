import { useAuth } from "@/src/context/AuthContext";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  primary: "#C8102E",
  dark: "#003D66",
  light: "#f5f5f5",
  white: "#ffffff",
  gray: "#666666",
  border: "#e0e0e0",
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas cerrar sesión?", [
      { text: "Cancelar" },
      {
        text: "Sí, cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account" size={48} color={COLORS.white} />
          </View>
          <Text style={styles.userName}>{user?.fullName || "Estudiante"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="book-education-outline" size={22} color={COLORS.dark} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Programa Académico</Text>
              <Text style={styles.infoValue}>{user?.program || "No definido"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="school-outline" size={22} color={COLORS.dark} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Semestre</Text>
              <Text style={styles.infoValue}>{user?.semester ? `${user.semester}° Semestre` : "No definido"}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color={COLORS.white} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>ManagerTask v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  header: {
    backgroundColor: COLORS.dark,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.white },
  content: { flex: 1, padding: 16 },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.dark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  userName: { fontSize: 20, fontWeight: "bold", color: COLORS.dark },
  userEmail: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  infoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.gray },
  infoValue: { fontSize: 16, fontWeight: "600", color: COLORS.dark, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.light, marginLeft: 34 },
  logoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: { color: COLORS.white, fontSize: 16, fontWeight: "bold" },
  versionText: {
    textAlign: "center",
    color: COLORS.border,
    fontSize: 12,
    marginTop: 24,
  },
});
