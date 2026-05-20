import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  success: "#2ECC71",
  warning: "#F39C12",
};

interface SubjectItem {
  id: string;
  name: string;
  color: string;
  credits: number;
}

interface ActivityItem {
  id: string;
  type: "tarea" | "parcial" | "recordatorio";
  title: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  estimated_hours: number;
  priority: "baja" | "media" | "alta";
  completed: boolean;
  subject_id: string | null;
  subjects: SubjectItem | null;
}

type FilterType = "todas" | "tarea" | "parcial" | "recordatorio";

const ACTIVITY_ICONS: Record<string, any> = {
  tarea: "file-document-outline",
  parcial: "pencil-box-outline",
  recordatorio: "bell-outline",
};

const ACTIVITY_LABELS: Record<string, string> = {
  tarea: "Tarea",
  parcial: "Parcial",
  recordatorio: "Recordatorio",
};

export default function ActivitiesScreen() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("todas");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);

  const [formType, setFormType] = useState<"tarea" | "parcial" | "recordatorio">("tarea");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formDueTime, setFormDueTime] = useState("");
  const [formEstimatedHours, setFormEstimatedHours] = useState("");
  const [formPriority, setFormPriority] = useState<"baja" | "media" | "alta">("media");
  const [formSubjectId, setFormSubjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [{ data: actData }, { data: subjData }] = await Promise.all([
      supabase
        .from("activities")
        .select("id, type, title, description, due_date, due_time, estimated_hours, priority, completed, subject_id, subjects(id, name, color, credits)")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true }),
      supabase.from("subjects").select("id, name, color, credits").eq("user_id", user.id).order("name"),
    ]);

    setActivities((actData as any[]) || []);
    setSubjects((subjData as any[]) || []);
    if (subjData && subjData.length > 0 && !formSubjectId) {
      setFormSubjectId(subjData[0].id);
    }
    setLoading(false);
  }, [user?.id, formSubjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleComplete = async (activity: ActivityItem) => {
    const { error } = await supabase
      .from("activities")
      .update({ completed: !activity.completed })
      .eq("id", activity.id);

    if (!error) {
      setActivities((prev) =>
        prev.map((a) => (a.id === activity.id ? { ...a, completed: !a.completed } : a))
      );
    }
  };

  const deleteActivity = (activity: ActivityItem) => {
    Alert.alert("Eliminar", `¿Eliminar "${activity.title}"?`, [
      { text: "Cancelar" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("activities").delete().eq("id", activity.id);
          if (!error) {
            setActivities((prev) => prev.filter((a) => a.id !== activity.id));
          }
        },
      },
    ]);
  };

  const openCreateModal = () => {
    setEditingActivity(null);
    setFormType("tarea");
    setFormTitle("");
    setFormDescription("");
    setFormDueDate(new Date().toISOString().split("T")[0]);
    setFormDueTime("");
    setFormEstimatedHours("");
    setFormPriority("media");
    if (subjects.length > 0) setFormSubjectId(subjects[0].id);
    setModalVisible(true);
  };

  const openEditModal = (activity: ActivityItem) => {
    setEditingActivity(activity);
    setFormType(activity.type);
    setFormTitle(activity.title);
    setFormDescription(activity.description || "");
    setFormDueDate(activity.due_date);
    setFormDueTime(activity.due_time?.slice(0, 5) || "");
    setFormEstimatedHours(activity.estimated_hours?.toString() || "");
    setFormPriority(activity.priority);
    setFormSubjectId(activity.subject_id || "");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Error", "El título es obligatorio");
      return;
    }
    if (!formDueDate) {
      Alert.alert("Error", "La fecha de entrega es obligatoria");
      return;
    }

    setSaving(true);
    const payload = {
      user_id: user?.id,
      subject_id: formSubjectId || null,
      type: formType,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      due_date: formDueDate,
      due_time: formDueTime || null,
      estimated_hours: parseFloat(formEstimatedHours) || 0,
      priority: formPriority,
    };

    if (editingActivity) {
      const { error } = await supabase.from("activities").update(payload).eq("id", editingActivity.id);
      if (error) {
        Alert.alert("Error", "No se pudo actualizar la actividad");
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("activities").insert(payload);
      if (error) {
        Alert.alert("Error", "No se pudo crear la actividad");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalVisible(false);
    await fetchData();
  };

  const filtered = filter === "todas"
    ? activities
    : activities.filter((a) => a.type === filter);

  const pending = filtered.filter((a) => !a.completed);
  const completed = filtered.filter((a) => a.completed);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.dark} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Actividades</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(["todas", "tarea", "parcial", "recordatorio"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "todas" ? "Todas" : ACTIVITY_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.dark]} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>Sin actividades</Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <Text style={styles.sectionLabel}>Pendientes ({pending.length})</Text>
            )}
            {pending.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => openEditModal(activity)}
                onLongPress={() => deleteActivity(activity)}
              >
                <TouchableOpacity onPress={() => toggleComplete(activity)}>
                  <MaterialCommunityIcons
                    name="checkbox-blank-circle-outline"
                    size={24}
                    color={activity.subjects?.color || COLORS.gray}
                  />
                </TouchableOpacity>
                <View style={styles.activityCardInfo}>
                  <Text style={[styles.activityCardTitle, activity.completed && styles.completedTitle]}>
                    {activity.title}
                  </Text>
                  <Text style={styles.activityCardMeta}>
                    {activity.subjects?.name || "Sin materia"} | {new Date(activity.due_date + "T00:00:00").toLocaleDateString("es-CO")}
                    {activity.due_time ? ` | ${activity.due_time.slice(0, 5)}` : ""}
                  </Text>
                </View>
                <View style={styles.activityCardRight}>
                  <MaterialCommunityIcons name={ACTIVITY_ICONS[activity.type]} size={20} color={COLORS.gray} />
                  {activity.priority === "alta" && (
                    <MaterialCommunityIcons name="flag" size={16} color={COLORS.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {completed.length > 0 && (
              <Text style={styles.sectionLabel}>Completadas ({completed.length})</Text>
            )}
            {completed.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => openEditModal(activity)}
                onLongPress={() => deleteActivity(activity)}
              >
                <TouchableOpacity onPress={() => toggleComplete(activity)}>
                  <MaterialCommunityIcons
                    name="checkbox-marked-circle"
                    size={24}
                    color={COLORS.success}
                  />
                </TouchableOpacity>
                <View style={styles.activityCardInfo}>
                  <Text style={[styles.activityCardTitle, styles.completedTitle]}>
                    {activity.title}
                  </Text>
                  <Text style={styles.activityCardMeta}>
                    {activity.subjects?.name || "Sin materia"} | {new Date(activity.due_date + "T00:00:00").toLocaleDateString("es-CO")}
                  </Text>
                </View>
                <MaterialCommunityIcons name="check" size={20} color={COLORS.success} />
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingActivity ? "Editar" : "Nueva"} Actividad</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={styles.modalSave}>{saving ? "..." : "Guardar"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalTypeRow}>
              {(["tarea", "parcial", "recordatorio"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.modalTypeChip, formType === t && styles.modalTypeChipActive]}
                  onPress={() => setFormType(t)}
                >
                  <MaterialCommunityIcons
                    name={ACTIVITY_ICONS[t]}
                    size={18}
                    color={formType === t ? COLORS.white : COLORS.gray}
                  />
                  <Text style={[styles.modalTypeText, formType === t && styles.modalTypeTextActive]}>
                    {ACTIVITY_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Título *</Text>
              <TextInput style={styles.formInput} value={formTitle} onChangeText={setFormTitle} placeholder="Nombre de la actividad" placeholderTextColor="#999" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción</Text>
              <TextInput style={[styles.formInput, styles.formTextArea]} value={formDescription} onChangeText={setFormDescription} placeholder="Detalles adicionales" placeholderTextColor="#999" multiline numberOfLines={3} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Materia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipRow}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.formChip, formSubjectId === s.id && styles.formChipActive, { borderColor: s.color }]}
                    onPress={() => setFormSubjectId(s.id)}
                  >
                    <Text style={[styles.formChipText, formSubjectId === s.id && { color: COLORS.white }]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Fecha *</Text>
                <TextInput style={styles.formInput} value={formDueDate} onChangeText={setFormDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Hora</Text>
                <TextInput style={styles.formInput} value={formDueTime} onChangeText={setFormDueTime} placeholder="HH:MM" placeholderTextColor="#999" />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Horas estimadas</Text>
                <TextInput style={styles.formInput} value={formEstimatedHours} onChangeText={setFormEstimatedHours} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Prioridad</Text>
                <View style={styles.priorityRow}>
                  {(["baja", "media", "alta"] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityChip, formPriority === p && styles.priorityChipActive]}
                      onPress={() => setFormPriority(p)}
                    >
                      <Text style={[styles.priorityChipText, formPriority === p && styles.priorityChipTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {editingActivity && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setModalVisible(false);
                  deleteActivity(editingActivity);
                }}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.primary} />
                <Text style={styles.deleteButtonText}>Eliminar actividad</Text>
              </TouchableOpacity>
            )}

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.light },
  header: {
    backgroundColor: COLORS.dark,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.white },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: COLORS.light,
  },
  filterChipActive: { backgroundColor: COLORS.dark },
  filterText: { fontSize: 13, color: COLORS.gray },
  filterTextActive: { color: COLORS.white, fontWeight: "600" },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray,
    marginBottom: 8,
    marginTop: 8,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  activityCardInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  activityCardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.dark },
  completedTitle: { textDecorationLine: "line-through", color: COLORS.gray },
  activityCardMeta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  activityCardRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  modalContainer: { flex: 1, backgroundColor: COLORS.light },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: { color: COLORS.gray, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "600", color: COLORS.dark },
  modalSave: { color: COLORS.primary, fontSize: 16, fontWeight: "600" },
  modalContent: { flex: 1, padding: 16 },
  modalTypeRow: { flexDirection: "row", marginBottom: 20, gap: 8 },
  modalTypeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  modalTypeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modalTypeText: { fontSize: 13, color: COLORS.gray },
  modalTypeTextActive: { color: COLORS.white, fontWeight: "600" },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600", color: COLORS.dark, marginBottom: 8 },
  formInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  formTextArea: { height: 80, textAlignVertical: "top" },
  formRow: { flexDirection: "row", gap: 12 },
  formChipRow: { paddingVertical: 4 },
  formChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    backgroundColor: COLORS.white,
  },
  formChipActive: { backgroundColor: COLORS.dark },
  formChipText: { fontSize: 12, color: COLORS.gray },
  priorityRow: { flexDirection: "row", gap: 6 },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priorityChipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  priorityChipText: { fontSize: 11, color: COLORS.gray, textTransform: "capitalize" },
  priorityChipTextActive: { color: COLORS.white },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
  bottomSpacing: { height: 40 },
});
