import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import { triggerOnboardingRestart } from "@/src/hooks/useOnboarding";
import { DashboardSkeleton } from "@/src/components/SkeletonLoader";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    RefreshControl,
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
  success: "#2ECC71",
  warning: "#F39C12",
};

interface SubjectItem {
  id: string;
  name: string;
  code: string | null;
  credits: number;
  color: string;
}

interface ScheduleItem {
  id: string;
  subject_id: string;
  start_time: string;
  end_time: string;
  classroom: string | null;
  subjects: SubjectItem | null;
}

interface ActivityItem {
  id: string;
  type: "tarea" | "parcial" | "recordatorio";
  title: string;
  due_date: string;
  subject_id: string | null;
  priority: string;
  completed: boolean;
  subjects: SubjectItem | null;
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ACTIVITY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  tarea: "file-document-outline",
  parcial: "pencil-box-outline",
  recordatorio: "bell-outline",
};

function formatRelativeDate(dueDateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Para hoy";
  if (diffDays === 1) return "Para mañana";
  return `Para dentro de ${diffDays} días`;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [todayClasses, setTodayClasses] = useState<ScheduleItem[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<ActivityItem[]>([]);
  const [academicLoad, setAcademicLoad] = useState<{ level: string; color: string }>({
    level: "",
    color: COLORS.gray,
  });

  const fetchDashboard = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    const today = new Date();
    const jsDay = today.getDay();
    const dbDay = jsDay === 0 ? 7 : jsDay;

    try {
      const [
        { data: todayData },
        { data: activitiesData },
        { data: weekSchedules },
      ] = await Promise.all([
        supabase
          .from("schedules")
          .select("id, subject_id, start_time, end_time, classroom, subjects(id, name, code, credits, color)")
          .eq("user_id", user.id)
          .eq("day_of_week", dbDay)
          .order("start_time"),

        supabase
          .from("activities")
          .select("id, type, title, due_date, subject_id, priority, completed, subjects(id, name, code, credits, color)")
          .eq("user_id", user.id)
          .eq("completed", false)
          .gte("due_date", today.toISOString().split("T")[0])
          .order("due_date")
          .limit(5),

        supabase
          .from("schedules")
          .select("start_time, end_time")
          .eq("user_id", user.id)
          .gte("day_of_week", 1)
          .lte("day_of_week", 7),
      ]);

      setTodayClasses((todayData as any[]) || []);
      setUpcomingActivities((activitiesData as any[]) || []);

      let scheduleHours = 0;
      (weekSchedules as any[])?.forEach((s: any) => {
        if (s.start_time && s.end_time) {
          const [sh, sm] = s.start_time.split(":").map(Number);
          const [eh, em] = s.end_time.split(":").map(Number);
          scheduleHours += (eh + em / 60) - (sh + sm / 60);
        }
      });

      if (scheduleHours <= 20) {
        setAcademicLoad({ level: "Ligero", color: COLORS.success });
      } else if (scheduleHours <= 35) {
        setAcademicLoad({ level: "Moderado", color: COLORS.warning });
      } else {
        setAcademicLoad({ level: "Pesado", color: COLORS.primary });
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      setError("No se pudieron cargar los datos. Desliza para intentar de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="school" size={28} color={COLORS.white} />
          <Text style={styles.headerTitle}>ManagerTask</Text>
        </View>
        <TouchableOpacity style={styles.guideButton} onPress={triggerOnboardingRestart} activeOpacity={0.7}>
          <MaterialCommunityIcons name="owl" size={18} color={COLORS.dark} />
          <Text style={styles.guideButtonText}>Guíame Búho</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#ffffff" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.dark]} />}
      >
        {/* Academic Load Badge */}
        {academicLoad.level !== "" && (
          <View style={[styles.loadBadge, { backgroundColor: academicLoad.color }]}>
            <Text style={styles.loadBadgeText}>Carga de esta semana: {academicLoad.level}</Text>
          </View>
        )}

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar-today" size={22} color={COLORS.dark} />
            <Text style={styles.sectionTitle}>Clases de hoy</Text>
            <Text style={styles.sectionSubtitle}>{DAYS[new Date().getDay()]}</Text>
          </View>

          {todayClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={40} color={COLORS.border} />
              <Text style={styles.emptyText}>No tienes clases hoy</Text>
              <Text style={styles.emptySubtext}>Agrega tu horario desde la sección Horario</Text>
            </View>
          ) : (
            todayClasses.map((cls) => (
              <View key={cls.id} style={styles.scheduleItem}>
                <View style={[styles.scheduleDot, { backgroundColor: cls.subjects?.color || COLORS.dark }]} />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleName}>{cls.subjects?.name || "Sin materia"}</Text>
                  <Text style={styles.scheduleTime}>
                    {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                    {cls.classroom ? ` | ${cls.classroom}` : ""}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.border} />
              </View>
            ))
          )}
        </View>

        {/* Upcoming Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={COLORS.dark} />
            <Text style={styles.sectionTitle}>Próximas actividades</Text>
          </View>

          {upcomingActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={40} color={COLORS.border} />
              <Text style={styles.emptyText}>Sin actividades pendientes</Text>
              <Text style={styles.emptySubtext}>Agrega tareas, parciales o recordatorios</Text>
            </View>
          ) : (
            upcomingActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  <MaterialCommunityIcons
                    name={ACTIVITY_ICONS[activity.type] || "checkbox-blank-circle-outline"}
                    size={22}
                    color={activity.subjects?.color || COLORS.dark}
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{activity.title}</Text>
                  <Text style={styles.activityMeta}>
                    {activity.subjects?.name || "Sin materia"} | {formatRelativeDate(activity.due_date)}
                  </Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: activity.type === "tarea" ? COLORS.warning : COLORS.primary }]}>
                  <Text style={styles.priorityText}>{activity.type === "tarea" ? "Tarea" : "Parcial"}</Text>
                </View>
              </View>
            ))
          )}
        </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.light,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
  },
  guideButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  guideButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.dark,
  },
  errorBanner: {
    backgroundColor: "#E74C3C",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  errorText: {
    color: "#ffffff",
    fontSize: 13,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadBadge: {
    alignSelf: "center",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 16,
  },
  loadBadgeText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "bold",
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.dark,
    marginLeft: 8,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.border,
    marginTop: 4,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  scheduleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  scheduleTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.light,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  activityMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  priorityBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  bottomSpacing: {
    height: 20,
  },
});
