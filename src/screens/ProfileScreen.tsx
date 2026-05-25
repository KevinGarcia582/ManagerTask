import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import { useStyledAlert } from "@/src/components/StyledAlert";
import { useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  primary: "#003B82",
  dark: "#0B356C",
  background: "#F4F5F7",
  textSecondary: "#98A2B3",
  divider: "#E8E8E8",
  white: "#FFFFFF",
  red: "#D62839",
  success: "#08A045",
  warning: "#E57A00",
  inactive: "#A0A7B5",
  lightBlue: "rgba(0, 59, 130, 0.08)",
};

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const showAlert = useStyledAlert();
  const [activityStats, setActivityStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [semesterCount, setSemesterCount] = useState(10);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editSemester, setEditSemester] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const [{ data: acts }, { data: prog }] = await Promise.all([
        supabase
          .from("activities")
          .select("id, completed, due_date")
          .eq("user_id", user.id),
        user.program
          ? supabase.from("programs").select("semester_count").eq("name", user.program).single()
          : Promise.resolve({ data: null }),
      ]);

      const activities = (acts as any[]) || [];
      setActivityStats({
        total: activities.length,
        completed: activities.filter((a) => a.completed).length,
        pending: activities.filter((a) => !a.completed && a.due_date >= today).length,
      });

      const countFromDB = prog ? (prog as any).semester_count : 0;
      setSemesterCount(Math.max(countFromDB || 10, user?.semester ?? 0, 10));
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.program, user?.semester]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length > 0) return parts[0].substring(0, 2).toUpperCase();
    return "?";
  };

  const openEditModal = () => {
    setEditName(user?.fullName || "");
    setEditProgram(user?.program || "");
    setEditSemester(user?.semester || null);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showAlert({ variant: "error", title: "Error", message: "El nombre es obligatorio" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile(editProgram.trim(), editSemester || 1, undefined, editName.trim());
      showAlert({ variant: "success", title: "Éxito", message: "Perfil actualizado" });
      setEditModalVisible(false);
      await fetchData();
    } catch {
      showAlert({ variant: "error", title: "Error", message: "No se pudo actualizar el perfil" });
    }
    setSaving(false);
  };

  const handleLogout = () => {
    showAlert({
      variant: "confirm",
      title: "Cerrar Sesión",
      message: "¿Estás seguro de que deseas cerrar sesión?",
      confirmText: "Cerrar sesión",
      cancelText: "Cancelar",
      onConfirm: async () => {
        await logout();
        router.replace("/login");
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const { total, completed, pending } = activityStats;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <MaterialCommunityIcons name="school" size={28} color={COLORS.white} />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>ManagerTask</Text>
            <Text style={styles.headerSubtitle}>Sistema de Gestión Académica</Text>
          </View>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.fullName)}</Text>
          </View>
          <Text style={styles.userName}>{user?.fullName || "Estudiante"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Mini Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{completed}</Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{pending}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconCircle, { backgroundColor: COLORS.lightBlue }]}>
              <MaterialCommunityIcons name="book-education-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Programa Académico</Text>
              <Text style={styles.infoValue}>{user?.program || "No definido"}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIconCircle, { backgroundColor: COLORS.lightBlue }]}>
              <MaterialCommunityIcons name="school-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Semestre</Text>
              <Text style={styles.infoValue}>
                {user?.semester ? `${user.semester}° Semestre` : "No definido"}
              </Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIconCircle, { backgroundColor: COLORS.lightBlue }]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Correo electrónico</Text>
              <Text style={styles.infoValue}>{user?.email || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity style={styles.editButton} onPress={openEditModal} activeOpacity={0.7}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.primary} />
          <Text style={styles.editButtonText}>Editar perfil</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.red} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>ManagerTask v1.0.0</Text>
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
              <Text style={styles.modalSave}>{saving ? "..." : "Guardar"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nombre completo</Text>
              <TextInput
                style={styles.formInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Tu nombre"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Programa académico</Text>
              <TextInput
                style={styles.formInput}
                value={editProgram}
                onChangeText={setEditProgram}
                placeholder="Ej: Ingeniería de Sistemas"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Semestre</Text>
              <View style={styles.semesterGrid}>
                {Array.from({ length: semesterCount }, (_, i) => i + 1).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.semesterChip, editSemester === s && styles.semesterChipActive]}
                    onPress={() => setEditSemester(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.semesterChipText, editSemester === s && styles.semesterChipTextActive]}>
                      {s}°
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  scroll: { flex: 1 },

  header: {
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  headerIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTextGroup: { marginLeft: 14 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.primary },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.dark,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  infoIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 3,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 56,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  editButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.red,
  },

  versionText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 28,
  },

  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.primary,
  },
  modalCancel: { color: "rgba(255,255,255,0.7)", fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "600", color: COLORS.white },
  modalSave: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  modalContent: { flex: 1, padding: 16 },

  formGroup: { marginBottom: 20 },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.dark,
  },
  semesterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  semesterChip: {
    width: 56,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  semesterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  semesterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  semesterChipTextActive: {
    color: COLORS.white,
  },

  bottomSpacing: { height: 40 },
});
