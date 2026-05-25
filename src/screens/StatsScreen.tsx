import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
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
  lightGreen: "rgba(8, 160, 69, 0.1)",
  lightOrange: "rgba(229, 122, 0, 0.1)",
  lightGray: "rgba(160, 167, 181, 0.1)",
};

interface ActivitySummary {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export default function StatsScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ActivitySummary>({ total: 0, completed: 0, pending: 0, overdue: 0 });
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    const today = new Date().toISOString().split("T")[0];

    const { data: all } = await supabase
      .from("activities")
      .select("id, completed, due_date")
      .eq("user_id", user.id);

    const activities = (all as any[]) || [];
    const total = activities.length;
    const completed = activities.filter((a) => a.completed).length;
    const pending = activities.filter((a) => !a.completed && a.due_date >= today).length;
    const overdue = activities.filter((a) => !a.completed && a.due_date < today).length;

    setSummary({ total, completed, pending, overdue });
    setCompletionRate(total > 0 ? completed / total : null);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const { total, completed, pending, overdue } = summary;

  return (
    <View style={styles.container}>
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

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Section Title */}
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="chart-box-outline" size={26} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>
            Estadísticas<Text style={styles.sectionTitleDot}>.</Text>
          </Text>
        </View>
        <Text style={styles.sectionSubtitle}>Resumen de tu rendimiento académico</Text>
        <View style={styles.sectionDivider} />

        {/* Metric Grid 2x2 */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: COLORS.lightBlue }]}>
                <MaterialCommunityIcons name="book-open-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={[styles.metricValue, { color: COLORS.primary }]}>{total}</Text>
              <Text style={styles.metricLabel}>Total actividades</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: COLORS.lightGreen }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={22} color={COLORS.success} />
              </View>
              <Text style={[styles.metricValue, { color: COLORS.success }]}>{completed}</Text>
              <Text style={styles.metricLabel}>Completadas</Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: COLORS.lightOrange }]}>
                <MaterialCommunityIcons name="clock-outline" size={22} color={COLORS.warning} />
              </View>
              <Text style={[styles.metricValue, { color: COLORS.warning }]}>{pending}</Text>
              <Text style={styles.metricLabel}>Pendientes</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: COLORS.lightGray }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={22} color={COLORS.inactive} />
              </View>
              <Text style={[styles.metricValue, { color: COLORS.inactive }]}>{overdue}</Text>
              <Text style={styles.metricLabel}>Vencidas</Text>
            </View>
          </View>
        </View>

        {/* Completion Rate Card */}
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <MaterialCommunityIcons name="trending-up" size={20} color={COLORS.primary} />
            <Text style={styles.completionTitle}>Tasa de completación</Text>
          </View>

          {completionRate !== null ? (
            <View style={styles.completionBody}>
              <Text style={styles.completionPercent}>{Math.round(completionRate * 100)}%</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${completionRate * 100}%` }]} />
              </View>
              <Text style={styles.completionMeta}>
                {completed} de {total} actividades completadas
              </Text>
            </View>
          ) : (
            <View style={styles.completionEmpty}>
              <Text style={styles.completionEmptyText}>
                Registra actividades para ver estadísticas
              </Text>
            </View>
          )}
        </View>

        {/* Empty State */}
        {total === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="chart-bar" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sin datos aún</Text>
            <Text style={styles.emptyText}>
              Registra actividades en la pestaña Tareas para ver estadísticas aquí.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
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

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  sectionTitleDot: {
    color: COLORS.red,
    fontSize: 26,
    fontWeight: "bold",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },

  grid: { paddingHorizontal: 20, gap: 16 },
  gridRow: { flexDirection: "row", gap: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 25,
    padding: 20,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 6,
    textAlign: "center",
  },

  completionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 25,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  completionBody: {
    alignItems: "center",
  },
  completionPercent: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 12,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.divider,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  completionMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  completionEmpty: {
    alignItems: "center",
    paddingVertical: 20,
  },
  completionEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 25,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 25,
    backgroundColor: COLORS.lightBlue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  bottomSpacing: { height: 40 },
});
