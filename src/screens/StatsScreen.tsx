import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
};

interface SubjectItem {
  id: string;
  name: string;
  color: string;
  credits: number;
}

interface StudyEntry {
  id: string;
  hours: number;
  study_date: string;
  notes: string | null;
  subject_id: string;
  subjects: SubjectItem;
}

export default function StatsScreen() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [entries, setEntries] = useState<StudyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formSubjectId, setFormSubjectId] = useState("");
  const [formHours, setFormHours] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [subjRes, entryRes] = await Promise.all([
      supabase.from("subjects").select("id, name, color, credits").eq("user_id", user.id).order("name"),
      supabase
        .from("study_hours")
        .select("id, hours, study_date, notes, subject_id, subjects(id, name, color, credits)")
        .eq("user_id", user.id)
        .order("study_date", { ascending: false })
        .limit(30),
    ]);

    const subjData = subjRes.data as SubjectItem[];
    setSubjects(subjData || []);
    if (subjData && subjData.length > 0 && !formSubjectId) {
      setFormSubjectId(subjData[0].id);
    }
    setEntries((entryRes.data as unknown as StudyEntry[]) || []);
    setLoading(false);
  }, [user?.id, formSubjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    const hours = parseFloat(formHours);
    if (!hours || hours <= 0) {
      Alert.alert("Error", "Ingresa un número válido de horas");
      return;
    }
    if (!formSubjectId) {
      Alert.alert("Error", "Selecciona una materia");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("study_hours").insert({
      user_id: user?.id,
      subject_id: formSubjectId,
      hours,
      study_date: formDate,
      notes: formNotes.trim() || null,
    });

    if (error) {
      Alert.alert("Error", "No se pudo guardar el registro");
    } else {
      setFormHours("");
      setFormNotes("");
      await fetchData();
    }
    setSaving(false);
  };

  const deleteEntry = (entry: StudyEntry) => {
    Alert.alert("Eliminar", "¿Eliminar este registro?", [
      { text: "Cancelar" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await supabase.from("study_hours").delete().eq("id", entry.id);
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        },
      },
    ]);
  };

  const totalBySubject = subjects.map((s) => {
    const total = entries
      .filter((e) => e.subject_id === s.id)
      .reduce((sum, e) => sum + e.hours, 0);
    return { ...s, total };
  });

  const grandTotal = entries.reduce((sum, e) => sum + e.hours, 0);
  const maxTotal = Math.max(...totalBySubject.map((s) => s.total), 1);

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
        <Text style={styles.headerTitle}>Estadísticas</Text>
        <Text style={styles.headerSubtitle}>Horas de estudio</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horas por materia</Text>
          {grandTotal === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="chart-bar" size={40} color={COLORS.border} />
              <Text style={styles.emptyText}>Sin datos aún</Text>
            </View>
          ) : (
            <>
              <View style={styles.barChart}>
                {totalBySubject.map((s) => (
                  <View key={s.id} style={styles.barItem}>
                    <Text style={styles.barValue}>{s.total.toFixed(1)}h</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(s.total / maxTotal) * 100}%`, backgroundColor: s.color }]} />
                    </View>
                    <Text style={styles.barLabel} numberOfLines={1}>{s.name}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.totalText}>Total: {grandTotal.toFixed(1)} horas</Text>
            </>
          )}
        </View>

        {/* Register Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registrar horas</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Materia</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.subjectChip, formSubjectId === s.id && { backgroundColor: s.color }, { borderColor: s.color }]}
                  onPress={() => setFormSubjectId(s.id)}
                >
                  <Text style={[styles.subjectChipText, formSubjectId === s.id && { color: COLORS.white }]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Horas</Text>
              <TextInput
                style={styles.formInput}
                value={formHours}
                onChangeText={setFormHours}
                placeholder="2.5"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Fecha</Text>
              <TextInput
                style={styles.formInput}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notas (opcional)</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder="Temas estudiados..."
              multiline
              numberOfLines={2}
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Registrar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial reciente</Text>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>Sin registros</Text>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryItem}
                onLongPress={() => deleteEntry(entry)}
              >
                <View style={[styles.entryDot, { backgroundColor: entry.subjects?.color || COLORS.gray }]} />
                <View style={styles.entryInfo}>
                  <Text style={styles.entrySubject}>{entry.subjects?.name}</Text>
                  <Text style={styles.entryMeta}>
                    {new Date(entry.study_date + "T00:00:00").toLocaleDateString("es-CO")}
                    {entry.notes ? ` | ${entry.notes}` : ""}
                  </Text>
                </View>
                <Text style={styles.entryHours}>{entry.hours}h</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  content: { flex: 1, padding: 16 },
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
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.dark, marginBottom: 16 },
  emptyState: { alignItems: "center", paddingVertical: 20 },
  emptyText: { fontSize: 13, color: COLORS.gray, marginTop: 8 },
  barChart: { gap: 16, marginBottom: 12 },
  barItem: {},
  barValue: { fontSize: 12, fontWeight: "600", color: COLORS.dark, marginBottom: 4 },
  barTrack: { height: 8, backgroundColor: COLORS.light, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barLabel: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  totalText: { fontSize: 14, fontWeight: "600", color: COLORS.dark, textAlign: "center", marginTop: 8 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600", color: COLORS.dark, marginBottom: 8 },
  formRow: { flexDirection: "row", gap: 12 },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    backgroundColor: COLORS.white,
  },
  subjectChipText: { fontSize: 12, color: COLORS.gray },
  formInput: {
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  formTextArea: { height: 60, textAlignVertical: "top" },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveButtonText: { color: COLORS.white, fontSize: 15, fontWeight: "bold" },
  entryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  entryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  entryInfo: { flex: 1 },
  entrySubject: { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  entryMeta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  entryHours: { fontSize: 16, fontWeight: "bold", color: COLORS.dark },
  bottomSpacing: { height: 40 },
});
