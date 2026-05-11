import { useAuth } from "@/src/context/AuthContext";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Picker,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const COLORS = {
  primary: "#C8102E",
  dark: "#003D66",
  light: "#f5f5f5",
  white: "#ffffff",
  gray: "#666666",
  border: "#e0e0e0",
};

const SCHEDULE_DATA = {
  "3": {
    hours: [
      "07:00 - 08:00",
      "08:00 - 09:00",
      "09:00 - 10:00",
      "10:00 - 11:00",
      "11:00 - 12:00",
      "12:00 - 13:00",
      "13:00 - 14:00",
      "14:00 - 15:00",
      "15:00 - 16:00",
      "16:00 - 17:00",
      "17:00 - 18:00",
    ],
    classes: {
      0: { Thursday: "Matemáticas I" },
      1: { Monday: "Matemáticas I", Wednesday: "Matemáticas I" },
      2: { Tuesday: "Programación I", Thursday: "Programación I" },
      4: { Monday: "Física I", Wednesday: "Física I", Friday: "Física I" },
      5: { Tuesday: "Bases de Datos", Thursday: "Bases de Datos" },
      7: { Monday: "Comunicación", Wednesday: "Comunicación" },
    },
  },
};

const SUBJECTS = {
  "3": [
    {
      id: "1",
      name: "Matemáticas I",
      credits: 4,
      type: "Obligatoria",
      color: "#4A90E2",
    },
    {
      id: "2",
      name: "Programación I",
      credits: 4,
      type: "Obligatoria",
      color: "#7ED321",
    },
    {
      id: "3",
      name: "Física I",
      credits: 4,
      type: "Obligatoria",
      color: "#F5A623",
    },
    {
      id: "4",
      name: "Bases de Datos",
      credits: 4,
      type: "Obligatoria",
      color: "#BD10E0",
    },
    {
      id: "5",
      name: "Comunicación",
      credits: 2,
      type: "Obligatoria",
      color: "#E71D36",
    },
  ],
};

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_KEYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [semester, setSemester] = useState(user?.semester || "3");
  const [menuOpen, setMenuOpen] = useState(false);

  const schedule = SCHEDULE_DATA[semester as keyof typeof SCHEDULE_DATA];
  const subjects = SUBJECTS[semester as keyof typeof SUBJECTS];

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas cerrar sesión?", [
      { text: "Cancelar", onPress: () => {} },
      {
        text: "Sí, cerrar sesión",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleSaveSchedule = () => {
    Alert.alert("Éxito", "Horario guardado correctamente");
  };

  const getClassAtTime = (timeIndex: number, dayIndex: number) => {
    const dayKey = DAYS_KEYS[dayIndex];
    const classData = schedule?.classes?.[timeIndex];
    if (classData && classData[dayKey as keyof typeof classData]) {
      return classData[dayKey as keyof typeof classData];
    }
    return null;
  };

  const getSubjectColor = (subjectName: string) => {
    const subject = subjects?.find((s) => s.name === subjectName);
    return subject?.color || "#999";
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)}>
          <MaterialCommunityIcons name="menu" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons
            name="school"
            size={32}
            color={COLORS.white}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>ManagerTask</Text>
            <Text style={styles.headerSubtitle}>
              Sistema de Gestión de Tareas
            </Text>
          </View>
        </View>
        <View style={styles.spacer} />
      </View>

      {/* Dropdown Menu */}
      {menuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <MaterialCommunityIcons
              name="logout"
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.menuItemText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userCard}>
          <Text style={styles.userLabel}>Usuario: {user?.username}</Text>
          <Text style={styles.userLabel}>Programa: {user?.program}</Text>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="calendar"
              size={24}
              color={COLORS.dark}
            />
            <Text style={styles.sectionTitle}>Horario Semanal</Text>
          </View>

          {/* Schedule Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={[styles.tableCell, styles.hourColumn]}>
                  <Text style={styles.tableHeaderText}>Hora</Text>
                </View>
                {DAYS.map((day, idx) => (
                  <View key={idx} style={[styles.tableCell, styles.dayColumn]}>
                    <Text style={styles.tableHeaderText}>{day}</Text>
                  </View>
                ))}
              </View>

              {schedule?.hours.map((hour, timeIdx) => (
                <View key={timeIdx} style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.hourColumn]}>
                    <Text style={styles.timeText}>{hour}</Text>
                  </View>
                  {DAYS.map((_, dayIdx) => {
                    const className = getClassAtTime(timeIdx, dayIdx);
                    const bgColor = className
                      ? getSubjectColor(className)
                      : COLORS.light;
                    return (
                      <View
                        key={dayIdx}
                        style={[
                          styles.tableCell,
                          styles.dayColumn,
                          {
                            backgroundColor: bgColor,
                            opacity: className ? 1 : 0.3,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.classText,
                            className && { color: COLORS.white },
                          ]}
                        >
                          {className || ""}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Semester Selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="book-open"
              size={24}
              color={COLORS.dark}
            />
            <Text style={styles.sectionTitle}>Semestre</Text>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={semester}
              onValueChange={setSemester}
              style={styles.picker}
            >
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((s) => (
                <Picker.Item key={s} label={`${s}° Semestre`} value={s} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Subjects Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="book-multiple"
              size={24}
              color={COLORS.dark}
            />
            <Text style={styles.sectionTitle}>
              Materias del {semester}° Semestre
            </Text>
          </View>

          {subjects?.map((subject) => (
            <View key={subject.id} style={styles.subjectCard}>
              <View
                style={[styles.subjectDot, { backgroundColor: subject.color }]}
              />
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectMeta}>
                  Créditos: {subject.credits}
                </Text>
              </View>
              <View style={styles.subjectBadge}>
                <Text
                  style={[styles.subjectBadgeText, { color: subject.color }]}
                >
                  {subject.type}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveSchedule}
        >
          <MaterialCommunityIcons
            name="content-save"
            size={24}
            color={COLORS.white}
          />
          <Text style={styles.saveButtonText}>Guardar Horario</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    backgroundColor: COLORS.dark,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  spacer: {
    width: 28,
  },
  menu: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  userLabel: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
    marginVertical: 4,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    marginLeft: 8,
  },
  table: {
    backgroundColor: COLORS.light,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.dark,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  hourColumn: {
    width: 80,
    backgroundColor: COLORS.light,
  },
  dayColumn: {
    width: 100,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.white,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.dark,
    fontWeight: "500",
  },
  classText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gray,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    color: COLORS.dark,
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.light,
    borderRadius: 6,
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  subjectMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 16,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});
