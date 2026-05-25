import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import { useStyledAlert } from "@/src/components/StyledAlert";
import { TaskCardSkeleton } from "@/src/components/SkeletonLoader";
import { useNotifications } from "@/src/hooks/useNotifications";
import { useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  dark: "#003B82",
  primary: "#003B82",
  secondary: "#0A4C9A",
  background: "#F5F6F8",
  textPrimary: "#24324A",
  textSecondary: "#98A2B3",
  divider: "#E8E8E8",
  white: "#FFFFFF",
  red: "#D62839",
  success: "#2ECC71",
  lightBlue: "rgba(0, 59, 130, 0.07)",
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

type FilterKey = "todas" | "pendientes" | "completadas";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendientes", label: "Pendientes" },
  { key: "completadas", label: "Completadas" },
];

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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export default function TasksScreen() {
  const { user } = useAuth();
  const showAlert = useStyledAlert();
  const { refreshNotifications } = useNotifications(user?.id);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [scrollY, setScrollY] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);

  const [formType, setFormType] = useState<"tarea" | "parcial">("tarea");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formDueTime, setFormDueTime] = useState("");
  const [formPriority, setFormPriority] = useState<"baja" | "media" | "alta">("media");
  const [formSubjectId, setFormSubjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    const { data: schedRefs } = await supabase
      .from("schedules")
      .select("subject_id")
      .eq("user_id", user.id);

    const scheduledIds = [...new Set((schedRefs || []).map((s: any) => s.subject_id).filter(Boolean))];

    const [{ data: actData }, { data: subjData }] = await Promise.all([
      supabase
        .from("activities")
        .select("id, type, title, description, due_date, due_time, estimated_hours, priority, completed, subject_id, subjects(id, name, color, credits)")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true }),
      supabase
        .from("subjects")
        .select("id, name, color, credits")
        .eq("user_id", user.id)
        .in("id", scheduledIds.length > 0 ? scheduledIds : ["none"])
        .order("name"),
    ]);

    setActivities((actData as any[]) || []);
    setSubjects((subjData as any[]) || []);
    if (subjData && subjData.length > 0 && !formSubjectId) {
      setFormSubjectId(subjData[0].id);
    }
    setLoading(false);
  }, [user?.id, formSubjectId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
      setScrollY(0);
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
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
      refreshNotifications();
    }
  };

  const deleteActivity = (activity: ActivityItem) => {
    showAlert({
      variant: "confirm",
      title: "Eliminar",
      message: `¿Eliminar "${activity.title}"?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        const { error } = await supabase.from("activities").delete().eq("id", activity.id);
        if (!error) {
          setActivities((prev) => prev.filter((a) => a.id !== activity.id));
          refreshNotifications();
        }
      },
    });
  };

  const openCreateModal = () => {
    setEditingActivity(null);
    setFormType("tarea");
    setFormTitle("");
    setFormDescription("");
    setFormDueDate(new Date().toISOString().split("T")[0]);
    setFormDueTime("");
    setFormPriority("media");
    if (subjects.length > 0) setFormSubjectId(subjects[0].id);
    setModalVisible(true);
  };

  const openEditModal = (activity: ActivityItem) => {
    setEditingActivity(activity);
    setFormType(activity.type === "recordatorio" ? "tarea" : activity.type);
    setFormTitle(activity.title);
    setFormDescription(activity.description || "");
    setFormDueDate(activity.due_date);
    setFormDueTime(activity.due_time?.slice(0, 5) || "");
    setFormPriority(activity.priority);
    setFormSubjectId(activity.subject_id || "");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      showAlert({ variant: "error", title: "Error", message: "El título es obligatorio" });
      return;
    }
    if (!formDueDate) {
      showAlert({ variant: "error", title: "Error", message: "La fecha de entrega es obligatoria" });
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
      priority: formPriority,
    };

    if (editingActivity) {
      const { error } = await supabase.from("activities").update(payload).eq("id", editingActivity.id);
      if (error) {
        showAlert({ variant: "error", title: "Error", message: "No se pudo actualizar la actividad" });
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("activities").insert(payload);
      if (error) {
        showAlert({ variant: "error", title: "Error", message: "No se pudo crear la actividad" });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalVisible(false);
    await fetchData();
    refreshNotifications();
  };

  const displayDate = (dateStr: string) => {
    if (!dateStr) return "Seleccionar fecha";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const displayTime = (timeStr: string) => {
    if (!timeStr) return "Seleccionar hora";
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (Platform.OS === "ios") setShowDatePicker(false);
    if (selectedDate) {
      setFormDueDate(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (Platform.OS === "ios") setShowTimePicker(false);
    if (selectedTime) {
      const h = selectedTime.getHours();
      const m = selectedTime.getMinutes();
      setFormDueTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  };

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filter === "todas") return true;
      if (filter === "pendientes") return !a.completed;
      if (filter === "completadas") return a.completed;
      return true;
    });
  }, [activities, filter]);

  const pending = useMemo(() => filtered.filter((a) => !a.completed), [filtered]);
  const completed = useMemo(() => filtered.filter((a) => a.completed), [filtered]);
  const totalPending = useMemo(() => activities.filter((a) => !a.completed).length, [activities]);
  const totalCompleted = useMemo(() => activities.filter((a) => a.completed).length, [activities]);
  const fabVisible = scrollY <= 10 && activities.length > 0;

  const renderCard = (activity: ActivityItem, isDone: boolean = false) => (
    <TouchableOpacity
      key={activity.id}
      style={styles.activityCard}
      onPress={() => openEditModal(activity)}
      onLongPress={() => deleteActivity(activity)}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        onPress={() => toggleComplete(activity)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons
          name={isDone ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
          size={26}
          color={isDone ? COLORS.success : (activity.subjects?.color || COLORS.textSecondary)}
        />
      </TouchableOpacity>
      <View style={styles.activityInfo}>
        <Text style={[styles.activityTitle, isDone && styles.activityTitleDone]} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={styles.activityMeta} numberOfLines={1}>
          {activity.subjects?.name || "Sin materia"} · {formatDate(activity.due_date)}
          {activity.due_time ? ` · ${activity.due_time.slice(0, 5)}` : ""}
        </Text>
      </View>
      <View style={styles.activityRight}>
        <MaterialCommunityIcons name={ACTIVITY_ICONS[activity.type]} size={18} color={COLORS.textSecondary} />
        {!isDone && activity.priority === "alta" && (
          <View style={styles.priorityBadge}>
            <MaterialCommunityIcons name="flag" size={12} color={COLORS.red} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {[1, 2, 3, 4, 5].map((i) => <TaskCardSkeleton key={i} />)}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>
            Tareas<Text style={styles.redDot}>.</Text>
          </Text>
          <Text style={styles.counter}>
            {totalPending} pendientes · {totalCompleted} completadas
          </Text>
        </View>
        {fabVisible && (
          <TouchableOpacity style={styles.fab} onPress={openCreateModal} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={32} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => { setFilter(tab.key); setScrollY(0); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {filter === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabDivider} />

      {filtered.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sin actividades aún</Text>
            <Text style={styles.emptySubtitle}>
              Toca el botón + para registrar tu primera actividad.
            </Text>
            {activities.length === 0 && (
              <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal} activeOpacity={0.8}>
                <MaterialCommunityIcons name="plus" size={22} color={COLORS.white} />
                <Text style={styles.emptyButtonText}>Nueva actividad</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
        >
          {pending.length > 0 && (
            <Text style={styles.sectionLabel}>Pendientes ({pending.length})</Text>
          )}
          {pending.map((activity) => renderCard(activity))}

          {completed.length > 0 && (
            <Text style={styles.sectionLabel}>Completadas ({completed.length})</Text>
          )}
          {completed.map((activity) => renderCard(activity, true))}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingActivity ? "Editar" : "Nueva"} Actividad
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={styles.modalSave}>{saving ? "..." : "Guardar"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo</Text>
              <View style={styles.typeRow}>
                {(["tarea", "parcial"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, formType === t && styles.typeChipActive]}
                    onPress={() => setFormType(t)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={ACTIVITY_ICONS[t]}
                      size={16}
                      color={formType === t ? COLORS.white : COLORS.textSecondary}
                    />
                    <Text style={[styles.typeChipText, formType === t && styles.typeChipTextActive]}>
                      {ACTIVITY_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Título *</Text>
              <TextInput
                style={styles.formInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Nombre de la actividad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Detalles adicionales"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Materia</Text>
              <View style={styles.subjectDropdown}>
                <TouchableOpacity
                  style={styles.subjectDropdownHeader}
                  onPress={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                  activeOpacity={0.7}
                >
                  {(() => {
                    const active = subjects.find((s) => s.id === formSubjectId);
                    if (!active) {
                      return <Text style={[styles.subjectListName, { color: COLORS.textSecondary }]}>Seleccionar materia</Text>;
                    }
                    return (
                      <>
                        <View style={[styles.subjectDot, { backgroundColor: active.color || COLORS.primary }]} />
                        <View style={styles.subjectListInfo}>
                          <Text style={styles.subjectListName}>{active.name}</Text>
                          <Text style={styles.subjectListMeta}>{active.credits} créditos</Text>
                        </View>
                        <View style={[styles.creditBadge, { backgroundColor: active.color || COLORS.primary }]}>
                          <Text style={styles.creditBadgeText}>{active.credits}</Text>
                        </View>
                      </>
                    );
                  })()}
                  <MaterialCommunityIcons
                    name={subjectDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
                {subjectDropdownOpen && (
                  <View style={styles.subjectDropdownItems}>
                    {subjects.map((s) => {
                      const isSelected = formSubjectId === s.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.subjectDropdownItem}
                          onPress={() => { setFormSubjectId(s.id); setSubjectDropdownOpen(false); }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.subjectDot, { backgroundColor: s.color || COLORS.primary }]} />
                          <View style={styles.subjectListInfo}>
                            <Text style={[styles.subjectListName, isSelected && { color: s.color || COLORS.primary }]}>
                              {s.name}
                            </Text>
                            <Text style={styles.subjectListMeta}>{s.credits} créditos</Text>
                          </View>
                          <View style={[styles.creditBadge, isSelected && { backgroundColor: s.color || COLORS.primary }]}>
                            <Text style={styles.creditBadgeText}>{s.credits}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Fecha *</Text>
                <TouchableOpacity style={styles.formInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: formDueDate ? COLORS.dark : "#999", fontSize: 14 }}>
                    {displayDate(formDueDate)}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={formDueDate ? new Date(formDueDate + "T00:00:00") : new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    onChange={onDateChange}
                  />
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Hora</Text>
                <TouchableOpacity style={styles.formInput} onPress={() => setShowTimePicker(true)}>
                  <Text style={{ color: formDueTime ? COLORS.dark : "#999", fontSize: 14 }}>
                    {displayTime(formDueTime)}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={formDueTime ? (() => { const [h, m] = formDueTime.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })() : new Date()}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onTimeChange}
                  />
                )}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Prioridad</Text>
                <View style={styles.priorityRow}>
                  {(["baja", "media", "alta"] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityChip, formPriority === p && styles.priorityChipActive]}
                      onPress={() => setFormPriority(p)}
                      activeOpacity={0.7}
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
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.red} />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 16 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {},
  sectionTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  redDot: {
    color: COLORS.red,
    fontSize: 30,
    fontWeight: "bold",
  },
  counter: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 8,
  },
  tabText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: "60%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  tabDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 0,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  activityInfo: { flex: 1, marginLeft: 14, marginRight: 10 },
  activityTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  activityTitleDone: {
    textDecorationLine: "line-through",
    color: COLORS.textSecondary,
  },
  activityMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  activityRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityBadge: {
    backgroundColor: "rgba(214, 40, 57, 0.1)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyState: {
    alignItems: "center",
    paddingBottom: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.lightBlue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: "75%",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: 10,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },

  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.dark,
  },
  modalCancel: { color: "rgba(255,255,255,0.7)", fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "600", color: COLORS.white },
  modalSave: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  modalContent: { flex: 1, padding: 16 },

  formGroup: { marginBottom: 16 },
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
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: COLORS.dark,
  },
  formTextArea: { height: 80, textAlignVertical: "top" },
  formRow: { flexDirection: "row", gap: 12 },

  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 6,
  },
  typeChipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  typeChipText: { fontSize: 12, color: COLORS.textSecondary },
  typeChipTextActive: { color: COLORS.white, fontWeight: "600" },

  subjectDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    overflow: "hidden",
  },
  subjectDropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  subjectDropdownItems: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  subjectDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subjectListInfo: { flex: 1 },
  subjectListName: { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  subjectListMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  creditBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  creditBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.white },

  priorityRow: { flexDirection: "row", gap: 8 },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
  },
  priorityChipActive: {
    backgroundColor: COLORS.dark,
    borderColor: COLORS.dark,
  },
  priorityChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "capitalize",
    fontWeight: "500",
  },
  priorityChipTextActive: { color: COLORS.white, fontWeight: "600" },

  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonText: { color: COLORS.red, fontSize: 14, fontWeight: "600" },

  bottomSpacing: { height: 60 },
});
