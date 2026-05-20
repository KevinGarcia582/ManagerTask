import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import { rescheduleAllNotifications } from "@/src/lib/notifications";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  dark: "#0B3A75",
  primary: "#C8102E",
  light: "#F5F5F5",
  white: "#FFFFFF",
  gray: "#666666",
  border: "#E0E0E0",
  success: "#2ECC71",
  warning: "#F39C12",
  bgAlt: "#F9F9F9",
  disabled: "#E8E8E8",
};

interface SubjectItem {
  id: string;
  name: string;
  color: string;
  credits: number;
}

interface ScheduleItem {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  classroom: string | null;
  subjects: SubjectItem | null;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_PAIRS = [
  { left: 0, right: 1, label: "Lun - Mar" },
  { left: 2, right: 3, label: "Mié - Jue" },
  { left: 4, right: 5, label: "Vie - Sáb" },
  { left: 6, right: null as number | null, label: "Dom" },
];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function to12h(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:00 ${period}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getCreditColor(credits: number) {
  if (credits <= 2) return COLORS.success;
  if (credits <= 3) return COLORS.warning;
  return COLORS.primary;
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayOffset, setDayOffset] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [preselectedSubject, setPreselectedSubject] = useState<{ name: string; id: string } | null>(null);
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formDay, setFormDay] = useState(1);
  const [formStartTime, setFormStartTime] = useState("07:00");
  const [formEndTime, setFormEndTime] = useState("09:00");
  const [formClassroom, setFormClassroom] = useState("");
  const [saving, setSaving] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
  const [semesterCourses, setSemesterCourses] = useState<{ id: string; name: string; code: string | null; credits: number }[]>([]);
  const [loadingSemesterCourses, setLoadingSemesterCourses] = useState(false);
  const [semesterDropdownOpen, setSemesterDropdownOpen] = useState(false);
  const [showSemesterCard, setShowSemesterCard] = useState(true);

  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [loadSemesters, setLoadSemesters] = useState<number[]>([]);
  const [loadSemester, setLoadSemester] = useState<number | null>(null);
  const [loadSemesterDropdownOpen, setLoadSemesterDropdownOpen] = useState(false);
  const [loadCourses, setLoadCourses] = useState<{ id: string; name: string; code: string | null; credits: number }[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [taskSubject, setTaskSubject] = useState<{ id: string; name: string } | null>(null);
  const [taskType, setTaskType] = useState<"tarea" | "parcial">("tarea");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [schedRes, subjRes, actRes] = await Promise.all([
      supabase
        .from("schedules")
        .select("id, subject_id, day_of_week, start_time, end_time, classroom, subjects(id, name, color, credits)")
        .eq("user_id", user.id)
        .order("day_of_week")
        .order("start_time"),
      supabase.from("subjects").select("id, name, color, credits").eq("user_id", user.id).order("name"),
      supabase
        .from("activities")
        .select("id, type, title, due_date, due_time, subject_id, subjects(id, name)")
        .eq("user_id", user.id)
        .eq("completed", false),
    ]);

    const schedulesData = (schedRes.data as any[]) || [];
    const activitiesData = (actRes.data as any[]) || [];

    setSchedules(schedulesData);
    setSubjects((subjRes.data as any[]) || []);
    if (subjRes.data && subjRes.data.length > 0 && !formSubjectId) {
      setFormSubjectId(subjRes.data[0].id);
    }

    rescheduleAllNotifications(schedulesData, activitiesData);

    if (!semesterFilter && user?.program) {
      const { data: progData } = await supabase
        .from("programs").select("id").eq("name", user.program).single();
      if (progData) {
        const { data: semData } = await supabase
          .from("courses").select("semester").eq("program_id", progData.id);
        if (semData) {
          setLoadSemesters([...new Set(semData.map((s: any) => s.semester))].sort((a, b) => a - b));
        }
      }
    }

    setLoading(false);
  }, [user?.id, formSubjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (taskType === "parcial" && taskSubject?.name) {
      setTaskTitle(`Parcial de ${taskSubject.name}`);
    } else if (taskType === "tarea") {
      setTaskTitle("");
    }
  }, [taskType, taskSubject?.name]);

  useEffect(() => {
    if (!semesterFilter || !user?.program) {
      setSemesterCourses([]);
      return;
    }
    const fetchSemesterCourses = async () => {
      setLoadingSemesterCourses(true);
      const { data: progData } = await supabase
        .from("programs").select("id").eq("name", user.program || "").single();
      if (!progData) { setLoadingSemesterCourses(false); return; }
      const { data: courses } = await supabase
        .from("courses").select("id, name, code, credits")
        .eq("program_id", progData.id).eq("semester", semesterFilter as number).order("name");
      setSemesterCourses((courses as any[]) || []);
      setLoadingSemesterCourses(false);
    };
    fetchSemesterCourses();
  }, [semesterFilter, user?.program]);

  const getClassesForDaySlot = (dayOfWeek: number, hourStart: number): ScheduleItem[] => {
    const slotStartMin = hourStart * 60;
    const slotEndMin = (hourStart + 1) * 60;
    return schedules.filter((s) => {
      if (s.day_of_week !== dayOfWeek) return false;
      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);
      return sStart < slotEndMin && sEnd > slotStartMin;
    });
  };

  const onSelectCourse = async (course: { id: string; name: string; code: string | null; credits: number }) => {
    const existingSubject = subjects.find((s) => s.name === course.name);
    let subjectId = existingSubject?.id;

    if (!subjectId) {
      const colors = ["#4A90D9", "#E74C3C", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C", "#E67E22", "#3498DB"];
      const { data: newSubj, error } = await supabase
        .from("subjects")
        .insert({
          user_id: user?.id,
          name: course.name,
          code: course.code || null,
          credits: course.credits,
          color: colors[Math.floor(Math.random() * colors.length)],
          is_custom: false,
        })
        .select("id")
        .single();
      if (error || !newSubj) { Alert.alert("Error", "No se pudo agregar la materia"); return; }
      subjectId = newSubj.id;
      await fetchData();
    }

    setPreselectedSubject({ name: course.name, id: subjectId! });
    setEditingSchedule(null);
    setFormSubjectId(subjectId!);
    setFormDay(DAY_PAIRS[dayOffset].left + 1);
    setFormStartTime("07:00");
    setFormEndTime("09:00");
    setFormClassroom("");
    setModalVisible(true);
  };

  const deleteSchedule = (schedule: ScheduleItem) => {
    Alert.alert("Eliminar", "¿Eliminar este bloque de horario?", [
      { text: "Cancelar" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("schedules").delete().eq("id", schedule.id);
          if (!error) setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
        },
      },
    ]);
  };

  const openEditModal = (schedule: ScheduleItem) => {
    setPreselectedSubject(null);
    setEditingSchedule(schedule);
    setFormSubjectId(schedule.subject_id);
    setFormDay(schedule.day_of_week);
    setFormStartTime(schedule.start_time.slice(0, 5));
    setFormEndTime(schedule.end_time.slice(0, 5));
    setFormClassroom(schedule.classroom || "");
    setModalVisible(true);
  };

  const openTaskForm = (schedule: ScheduleItem) => {
    if (!schedule.subjects) return;
    setTaskSubject({ id: schedule.subject_id, name: schedule.subjects.name });
    setTaskType("tarea");
    setTaskTitle("");
    const today = new Date();
    setTaskDueDate(formatDate(today));
    setTaskDueTime("");
    setTaskModalVisible(true);
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
    if (selectedDate) setTaskDueDate(formatDate(selectedDate));
  };

  const onTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (Platform.OS === "ios") setShowTimePicker(false);
    if (selectedTime) {
      const h = selectedTime.getHours();
      const m = selectedTime.getMinutes();
      setTaskDueTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  };

  const onStartTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowStartTimePicker(false);
    if (Platform.OS === "ios") setShowStartTimePicker(false);
    if (selectedTime) {
      setFormStartTime(`${String(selectedTime.getHours()).padStart(2, "0")}:${String(selectedTime.getMinutes()).padStart(2, "0")}`);
    }
  };

  const onEndTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowEndTimePicker(false);
    if (Platform.OS === "ios") setShowEndTimePicker(false);
    if (selectedTime) {
      setFormEndTime(`${String(selectedTime.getHours()).padStart(2, "0")}:${String(selectedTime.getMinutes()).padStart(2, "0")}`);
    }
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) { Alert.alert("Error", "El título es obligatorio"); return; }
    if (!taskDueDate) { Alert.alert("Error", "La fecha es obligatoria"); return; }

    setSavingTask(true);
    const { error } = await supabase.from("activities").insert({
      user_id: user?.id,
      subject_id: taskSubject?.id,
      type: taskType,
      title: taskTitle.trim(),
      due_date: taskDueDate,
      due_time: taskDueTime || null,
    });

    if (error) {
      Alert.alert("Error", "No se pudo guardar la actividad");
    } else {
      Alert.alert("Éxito", "Actividad guardada");
      setTaskModalVisible(false);
      await fetchData();
    }
    setSavingTask(false);
  };

  const handleSave = async () => {
    if (!formSubjectId) { Alert.alert("Error", "Selecciona una materia"); return; }
    if (timeToMinutes(formEndTime) <= timeToMinutes(formStartTime)) {
      Alert.alert("Error", "La hora de fin debe ser mayor a la de inicio"); return;
    }

    setSaving(true);

    const { data: conflicting } = await supabase
      .from("schedules")
      .select("id")
      .eq("user_id", user?.id)
      .eq("day_of_week", formDay)
      .lt("start_time", formEndTime)
      .gt("end_time", formStartTime);

    if (conflicting && conflicting.length > 0 && (!editingSchedule || conflicting.some((c: any) => c.id !== editingSchedule.id))) {
      Alert.alert("Conflicto", "Ya tienes una clase a esa hora ese día");
      setSaving(false);
      return;
    }
    const payload = {
      user_id: user?.id,
      subject_id: formSubjectId,
      day_of_week: formDay,
      start_time: formStartTime,
      end_time: formEndTime,
      classroom: formClassroom.trim() || null,
    };
    if (editingSchedule) {
      const { error } = await supabase.from("schedules").update(payload).eq("id", editingSchedule.id);
      if (error) { Alert.alert("Error", "No se pudo actualizar"); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("schedules").insert(payload);
      if (error) { Alert.alert("Error", "No se pudo guardar"); setSaving(false); return; }
    }
    setSaving(false);
    setModalVisible(false);
    const pairIndex = DAY_PAIRS.findIndex(
      (p) => p.left + 1 === formDay || (p.right !== null && p.right + 1 === formDay)
    );
    if (pairIndex >= 0) setDayOffset(pairIndex);
    await fetchData();
  };

  const openLoadCoursesModal = async () => {
    if (!user?.program) { Alert.alert("Perfil incompleto", "No tienes un programa asignado."); return; }
    setLoadingCourses(true);
    setLoadModalVisible(true);
    setLoadSemester(null);
    setLoadCourses([]);
    setSelectedCourseIds(new Set());
    setLoadSemesterDropdownOpen(false);
    const { data: progData } = await supabase.from("programs").select("id").eq("name", user.program).single();
    if (!progData) { Alert.alert("Error", `No se encontró el programa "${user.program}"`); setLoadingCourses(false); return; }
    const { data: semestersData } = await supabase.from("courses").select("semester").eq("program_id", progData.id);
    if (semestersData) {
      const unique = [...new Set(semestersData.map((s: any) => s.semester))].sort((a, b) => a - b);
      setLoadSemesters(unique);
    }
    setLoadingCourses(false);
  };

  const onSelectLoadSemester = async (semester: number) => {
    setLoadSemester(semester);
    setLoadSemesterDropdownOpen(false);
    setSelectedCourseIds(new Set());
    setLoadingCourses(true);
    const { data: progData } = await supabase.from("programs").select("id").eq("name", user?.program || "").single();
    if (!progData) { setLoadingCourses(false); return; }
    const { data: courses } = await supabase
      .from("courses").select("id, name, code, credits").eq("program_id", progData.id).eq("semester", semester).order("name");
    setLoadCourses((courses as any[]) || []);
    setLoadingCourses(false);
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) { next.delete(courseId); } else { next.add(courseId); }
      return next;
    });
  };

  const addSelectedCourses = async () => {
    if (selectedCourseIds.size === 0) { Alert.alert("Info", "Selecciona al menos una materia"); return; }
    const selected = loadCourses.filter((c) => selectedCourseIds.has(c.id));
    const colors = ["#4A90D9", "#E74C3C", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C", "#E67E22", "#3498DB"];
    const newSubjects = selected.map((course, index) => ({
      user_id: user?.id,
      name: course.name,
      code: course.code || null,
      credits: course.credits,
      color: colors[index % colors.length],
      is_custom: false,
    }));
    const { error } = await supabase.from("subjects").insert(newSubjects);
    if (error) { Alert.alert("Error", "No se pudieron cargar las materias: " + error.message); }
    else { Alert.alert("Éxito", `${newSubjects.length} materias agregadas`); setLoadModalVisible(false); await fetchData(); }
  };

  const canGoLeft = dayOffset > 0;
  const canGoRight = dayOffset < DAY_PAIRS.length - 1;
  const currentPair = DAY_PAIRS[dayOffset];

  const renderCell = (dayOfWeek: number, hour: number) => {
    const classes = getClassesForDaySlot(dayOfWeek, hour);
    if (classes.length === 0) {
      return <View style={styles.slot} />;
    }
    const cls = classes[0];
    const isFirstSlot = timeToMinutes(cls.start_time) >= hour * 60 && timeToMinutes(cls.start_time) < (hour + 1) * 60;
    if (!isFirstSlot) {
      return <View style={styles.slot} />;
    }
    const durationBlocks = Math.max(1, Math.ceil((timeToMinutes(cls.end_time) - timeToMinutes(cls.start_time)) / 60));
    const credits = cls.subjects?.credits || 0;
    const bgColor = credits <= 2 ? "rgba(46,204,113,0.12)" : credits <= 3 ? "rgba(243,156,18,0.12)" : "rgba(200,16,46,0.08)";
    const borderColor = getCreditColor(credits);
    return (
      <TouchableOpacity
        style={[styles.classBlock, { borderColor, backgroundColor: bgColor, height: 52 * durationBlocks }]}
        onPress={() => openTaskForm(cls)}
        onLongPress={() => openEditModal(cls)}
      >
        <Text style={styles.classBlockName} numberOfLines={2}>{cls.subjects?.name || "Sin materia"}</Text>
        <Text style={styles.classBlockRoom}>{cls.classroom || "Sin salón"}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.dark} />
      </View>
    );
  }

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
        <View style={styles.headerDivider} />

        {/* Schedule Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="calendar-month" size={22} color={COLORS.dark} />
              <Text style={styles.cardTitle}>Horario Semanal</Text>
            </View>
            <View style={styles.dayNav}>
              <TouchableOpacity onPress={() => canGoLeft && setDayOffset(dayOffset - 1)} disabled={!canGoLeft}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={canGoLeft ? COLORS.dark : COLORS.border} />
              </TouchableOpacity>
              <Text style={styles.dayNavLabel}>{currentPair.label}</Text>
              <TouchableOpacity onPress={() => canGoRight && setDayOffset(dayOffset + 1)} disabled={!canGoRight}>
                <MaterialCommunityIcons name="chevron-right" size={22} color={canGoRight ? COLORS.dark : COLORS.border} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <View style={styles.timeHeaderCell}><Text style={styles.tableHeaderText}>Hora</Text></View>
              <View style={styles.dayHeaderCell}><Text style={styles.tableHeaderText}>{DAYS[currentPair.left]}</Text></View>
              <View style={styles.dayHeaderCell}><Text style={styles.tableHeaderText}>{currentPair.right !== null ? DAYS[currentPair.right] : ""}</Text></View>
            </View>
            {HOURS.map((hour, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <View style={styles.timeCell}><Text style={styles.timeText}>{to12h(hour)}</Text></View>
                <View style={styles.dayColumn}>{renderCell(currentPair.left + 1, hour)}</View>
                <View style={styles.dayColumn}>{currentPair.right !== null && renderCell(currentPair.right + 1, hour)}</View>
              </View>
            ))}
          </View>
        </View>

        {/* Semester Selector Card */}
        {showSemesterCard && (
        <View style={styles.card}>
          <TouchableOpacity style={styles.dropdown} onPress={() => setSemesterDropdownOpen(!semesterDropdownOpen)}>
            <Text style={styles.dropdownText}>{semesterFilter ? `${semesterFilter}° Semestre` : "Semestre"}</Text>
            <MaterialCommunityIcons name={semesterDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={COLORS.gray} />
          </TouchableOpacity>
          {semesterDropdownOpen && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSemesterFilter(null); setSemesterDropdownOpen(false); }}>
                <Text style={[styles.dropdownItemText, !semesterFilter && styles.dropdownItemActive]}>Todos</Text>
              </TouchableOpacity>
              {loadSemesters.map((s) => (
                <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setSemesterFilter(s); setSemesterDropdownOpen(false); }}>
                  <Text style={[styles.dropdownItemText, semesterFilter === s && styles.dropdownItemActive]}>{s}° Semestre</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {semesterFilter && (
            <>
              <View style={styles.divider} />
              <Text style={styles.courseSectionTitle}>Materias de {semesterFilter}° semestre</Text>
              {loadingSemesterCourses ? (
                <ActivityIndicator size="small" color={COLORS.dark} style={{ padding: 16 }} />
              ) : semesterCourses.length === 0 ? (
                <Text style={styles.emptyText}>Sin materias</Text>
              ) : (
                semesterCourses.map((course) => (
                  <TouchableOpacity key={course.id} style={styles.courseCard} onPress={() => onSelectCourse(course)}>
                    <View style={styles.courseCardLeft}>
                      <View style={[styles.courseDot, { backgroundColor: getCreditColor(course.credits) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.courseCardName}>{course.name}</Text>
                        <Text style={styles.courseCardMeta}>{course.credits} créditos</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="plus-circle-outline" size={24} color={COLORS.dark} />
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </View>
        )}

        <View style={styles.card}>
          <TouchableOpacity style={styles.saveButton} onPress={() => setShowSemesterCard(!showSemesterCard)}>
            <Text style={styles.saveButtonText}>{showSemesterCard ? "Guardar Horario" : "Editar horario"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add/Edit Class Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingSchedule ? "Editar" : "Agregar"} clase</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={styles.modalSave}>{saving ? "..." : "Guardar"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {preselectedSubject ? (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Materia</Text>
                <View style={styles.preselectedChip}>
                  <Text style={styles.preselectedChipText}>{preselectedSubject.name}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Materia</Text>
                {subjects.length === 0 ? (
                  <View style={styles.noSubjects}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.warning} />
                    <Text style={styles.noSubjectsText}>No tienes materias cargadas</Text>
                    <TouchableOpacity style={styles.loadButton} onPress={() => { setModalVisible(false); openLoadCoursesModal(); }}>
                      <Text style={styles.loadButtonText}>Cargar materias</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {subjects.map((s) => (
                        <TouchableOpacity key={s.id} style={[styles.formChip, formSubjectId === s.id && { backgroundColor: s.color, borderColor: s.color }]} onPress={() => setFormSubjectId(s.id)}>
                          <Text style={[styles.formChipText, formSubjectId === s.id && { color: COLORS.white }]}>{s.name}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity style={styles.addMoreChip} onPress={() => { setModalVisible(false); openLoadCoursesModal(); }}>
                        <MaterialCommunityIcons name="plus" size={16} color={COLORS.dark} />
                        <Text style={styles.addMoreText}>Cargar más</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Día</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DAYS.map((d, idx) => (
                  <TouchableOpacity key={idx} style={[styles.formChip, formDay === idx + 1 && styles.formChipActive]} onPress={() => setFormDay(idx + 1)}>
                    <Text style={[styles.formChipText, formDay === idx + 1 && { color: COLORS.white }]}>{d.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Hora inicio</Text>
                <TouchableOpacity style={styles.formInput} onPress={() => setShowStartTimePicker(true)}>
                  <Text style={{ color: COLORS.dark, fontSize: 14 }}>{displayTime(formStartTime)}</Text>
                </TouchableOpacity>
                {showStartTimePicker && (
                  <DateTimePicker value={(() => { const [h, m] = formStartTime.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })()} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onStartTimeChange} />
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Hora fin</Text>
                <TouchableOpacity style={styles.formInput} onPress={() => setShowEndTimePicker(true)}>
                  <Text style={{ color: COLORS.dark, fontSize: 14 }}>{displayTime(formEndTime)}</Text>
                </TouchableOpacity>
                {showEndTimePicker && (
                  <DateTimePicker value={(() => { const [h, m] = formEndTime.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })()} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onEndTimeChange} />
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Salón (opcional)</Text>
              <TextInput style={styles.formInput} value={formClassroom} onChangeText={setFormClassroom} placeholder="Ej: A-101" placeholderTextColor="#999" />
            </View>

            {editingSchedule && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => { setModalVisible(false); deleteSchedule(editingSchedule); }}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.primary} />
                <Text style={styles.deleteButtonText}>Eliminar bloque</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Task Form Modal */}
      <Modal visible={taskModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nueva Actividad</Text>
            <TouchableOpacity onPress={handleSaveTask} disabled={savingTask}>
              <Text style={styles.modalSave}>{savingTask ? "..." : "Guardar"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Materia</Text>
              <View style={styles.preselectedChip}>
                <Text style={styles.preselectedChipText}>{taskSubject?.name}</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo</Text>
              <View style={styles.typeRow}>
                {(["tarea", "parcial"] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.typeChip, taskType === t && styles.typeChipActive]} onPress={() => setTaskType(t)}>
                    <MaterialCommunityIcons name={t === "tarea" ? "file-document-outline" : "pencil-box-outline"} size={16} color={taskType === t ? COLORS.white : COLORS.gray} />
                    <Text style={[styles.typeChipText, taskType === t && styles.typeChipTextActive]}>{t === "tarea" ? "Tarea" : "Parcial"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Título *</Text>
              <TextInput
                style={[styles.formInput, taskType === "parcial" && { backgroundColor: COLORS.bgAlt, color: COLORS.gray }]}
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="Nombre de la actividad"
                editable={taskType !== "parcial"}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Fecha *</Text>
                <TouchableOpacity style={styles.formInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: taskDueDate ? COLORS.dark : "#999", fontSize: 14 }}>{displayDate(taskDueDate)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker value={taskDueDate ? new Date(taskDueDate + "T00:00:00") : new Date()} mode="date" display={Platform.OS === "ios" ? "inline" : "default"} onChange={onDateChange} />
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Hora</Text>
                <TouchableOpacity style={styles.formInput} onPress={() => setShowTimePicker(true)}>
                  <Text style={{ color: taskDueTime ? COLORS.dark : "#999", fontSize: 14 }}>{displayTime(taskDueTime)}</Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker value={taskDueTime ? (() => { const [h, m] = taskDueTime.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })() : new Date()} mode="time" display={Platform.OS === "ios" ? "inline" : "default"} onChange={onTimeChange} />
                )}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Load Courses Modal */}
      <Modal visible={loadModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setLoadModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Cargar materias</Text>
            <TouchableOpacity onPress={addSelectedCourses} disabled={selectedCourseIds.size === 0}>
              <Text style={[styles.modalSave, selectedCourseIds.size === 0 && { opacity: 0.4 }]}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.formLabel}>Semestre</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setLoadSemesterDropdownOpen(!loadSemesterDropdownOpen)}>
              <Text style={styles.dropdownText}>{loadSemester ? `${loadSemester}° Semestre` : "Selecciona un semestre"}</Text>
              <MaterialCommunityIcons name={loadSemesterDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={COLORS.gray} />
            </TouchableOpacity>
            {loadSemesterDropdownOpen && (
              <View style={styles.dropdownMenu}>
                {loadSemesters.map((s) => (
                  <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => onSelectLoadSemester(s)}>
                    <Text style={[styles.dropdownItemText, loadSemester === s && styles.dropdownItemActive]}>{s}° Semestre</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 16 }} />

            {loadingCourses ? (
              <ActivityIndicator size="small" color={COLORS.dark} style={{ padding: 20 }} />
            ) : loadSemester && loadCourses.length === 0 ? (
              <Text style={styles.emptyText}>No hay materias para este semestre</Text>
            ) : loadSemester ? (
              <>
                <Text style={styles.formLabel}>Materias ({selectedCourseIds.size} seleccionadas)</Text>
                {loadCourses.map((course) => (
                  <TouchableOpacity key={course.id} style={styles.courseSelectItem} onPress={() => toggleCourseSelection(course.id)}>
                    <MaterialCommunityIcons name={selectedCourseIds.has(course.id) ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={selectedCourseIds.has(course.id) ? COLORS.dark : COLORS.border} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.courseSelectName}>{course.name}</Text>
                      <Text style={styles.courseSelectMeta}>{course.credits} créditos</Text>
                    </View>
                    <View style={[styles.creditBadge, { backgroundColor: getCreditColor(course.credits) }]}>
                      <Text style={styles.creditBadgeText}>{course.credits}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.light },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.dark,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTextGroup: { marginLeft: 14 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  headerSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  headerDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20, marginBottom: 4 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: COLORS.dark },

  dayNav: { flexDirection: "row", alignItems: "center", gap: 10 },
  dayNavLabel: { fontSize: 13, fontWeight: "600", color: COLORS.dark },

  tableContainer: { borderRadius: 10, overflow: "hidden" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: COLORS.dark },
  tableHeaderText: { fontSize: 12, fontWeight: "700", color: COLORS.white, textAlign: "center" },
  timeHeaderCell: { width: 62, paddingVertical: 12, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)" },
  dayHeaderCell: { flex: 1, paddingVertical: 12, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)" },
  tableRow: { flexDirection: "row", position: "relative", minHeight: 52 },
  tableRowAlt: { backgroundColor: COLORS.bgAlt },
  timeCell: { width: 62, paddingVertical: 14, paddingHorizontal: 4, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  timeText: { fontSize: 11, fontWeight: "600", color: COLORS.gray },
  dayColumn: { flex: 1, position: "relative" },
  slot: { height: 52, borderRightWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  classBlock: { position: "absolute", top: 0, left: 2, right: 2, borderWidth: 1.5, borderRadius: 8, padding: 6, justifyContent: "center", alignItems: "center", zIndex: 2 },
  classBlockName: { fontSize: 11, fontWeight: "700", color: COLORS.dark, textAlign: "center" },
  classBlockRoom: { fontSize: 10, color: COLORS.gray, marginTop: 2, textAlign: "center" },

  dropdown: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white },
  dropdownText: { fontSize: 14, color: COLORS.gray },
  dropdownMenu: { marginTop: -1, borderWidth: 1, borderColor: COLORS.border, borderTopWidth: 0, borderRadius: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, backgroundColor: COLORS.white, overflow: "hidden" },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.light },
  dropdownItemText: { fontSize: 14, color: COLORS.gray },
  dropdownItemActive: { color: COLORS.dark, fontWeight: "600" },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  courseSectionTitle: { fontSize: 14, fontWeight: "600", color: COLORS.dark, marginBottom: 12 },
  courseCard: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.light, justifyContent: "space-between" },
  courseCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  courseDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  courseCardName: { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  courseCardMeta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: "center", paddingVertical: 16 },

  saveButton: { backgroundColor: COLORS.disabled, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveButtonText: { fontSize: 16, fontWeight: "700", color: COLORS.gray },

  modalContainer: { flex: 1, backgroundColor: COLORS.light },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: COLORS.dark },
  modalCancel: { color: "rgba(255,255,255,0.7)", fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "600", color: COLORS.white },
  modalSave: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  modalContent: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600", color: COLORS.dark, marginBottom: 8 },
  formRow: { flexDirection: "row", gap: 12 },
  formInput: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 14, color: COLORS.dark },
  formChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1.5, backgroundColor: COLORS.white, borderColor: COLORS.border },
  formChipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  formChipText: { fontSize: 12, color: COLORS.gray },
  addMoreChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.dark, borderStyle: "dashed", gap: 4 },
  addMoreText: { fontSize: 12, color: COLORS.dark, fontWeight: "600" },
  preselectedChip: { backgroundColor: COLORS.dark, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, alignSelf: "flex-start" },
  preselectedChipText: { fontSize: 13, fontWeight: "600", color: COLORS.white },

  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  typeChipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  typeChipText: { fontSize: 12, color: COLORS.gray },
  typeChipTextActive: { color: COLORS.white, fontWeight: "600" },

  noSubjects: { alignItems: "center", paddingVertical: 20, backgroundColor: COLORS.bgAlt, borderRadius: 10 },
  noSubjectsText: { fontSize: 13, color: COLORS.gray, marginTop: 8, marginBottom: 12 },
  loadButton: { backgroundColor: COLORS.dark, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  loadButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "600" },

  courseSelectItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.light },
  courseSelectName: { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  courseSelectMeta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  creditBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  creditBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.white },

  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, gap: 8 },
  deleteButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
});
