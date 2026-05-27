import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import { useStyledAlert } from "@/src/components/StyledAlert";
import { NoteCardSkeleton } from "@/src/components/SkeletonLoader";
import { useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useMemo, useState } from "react";
import {
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
  dark: "#003B82",
  background: "#F5F6F8",
  textPrimary: "#0A356B",
  textSecondary: "#6B7280",
  divider: "#E5E7EB",
  white: "#FFFFFF",
  red: "#D62839",
  success: "#2ECC71",
  info: "#3498DB",
  lightBlue: "#EDF4FD",
  gradeExcellent: "#2ECC71",
  gradePassing: "#3498DB",
  gradeFailing: "#E74C3C",
  gradePending: "#D1D5DB",
};

const PASSING_GRADE = 3.0;

interface SubjectItem {
  id: string;
  name: string;
  color: string;
  credits: number;
}

interface GradeItem {
  id: string;
  subject_id: string;
  grade_20_1: number | null;
  grade_20_2: number | null;
  grade_20_3: number | null;
  grade_40: number | null;
}

function gradeStatusColor(value: number | null): string {
  if (value == null) return COLORS.gradePending;
  if (value >= 4.0) return COLORS.gradeExcellent;
  if (value >= PASSING_GRADE) return COLORS.gradePassing;
  return COLORS.gradeFailing;
}

function gradeLabel(value: number | null): string {
  if (value == null) return "--";
  return value.toFixed(1);
}

function calcWeightedAvg(g1: number | null, g2: number | null, g3: number | null, g4: number | null): number | null {
  let sum = 0;
  let weight = 0;
  if (g1 != null) { sum += g1 * 0.2; weight += 0.2; }
  if (g2 != null) { sum += g2 * 0.2; weight += 0.2; }
  if (g3 != null) { sum += g3 * 0.2; weight += 0.2; }
  if (g4 != null) { sum += g4 * 0.4; weight += 0.4; }
  if (weight === 0) return null;
  return sum / weight;
}

function calcNeededFor40(g1: number, g2: number, g3: number): number {
  const current = g1 * 0.2 + g2 * 0.2 + g3 * 0.2;
  return (PASSING_GRADE - current) / 0.4;
}

function getProgressPercent(g1: number | null, g2: number | null, g3: number | null, g4: number | null): number {
  let earned = 0;
  const max = PASSING_GRADE;
  if (g1 != null) earned += g1 * 0.2;
  if (g2 != null) earned += g2 * 0.2;
  if (g3 != null) earned += g3 * 0.2;
  if (g4 != null) earned += g4 * 0.4;
  return Math.min(earned / max, 1.0);
}

function getStatusText(
  g1: number | null, g2: number | null, g3: number | null, g4: number | null
): { text: string; icon: any; color: string } {
  const allThree20 = g1 != null && g2 != null && g3 != null;
  const allFour = allThree20 && g4 != null;

  if (allFour) {
    const final = calcWeightedAvg(g1, g2, g3, g4)!;
    if (final >= PASSING_GRADE) {
      return { text: `Promedio final: ${final.toFixed(2)} — Aprobado`, icon: "check-circle", color: COLORS.success };
    }
    return { text: `Promedio final: ${final.toFixed(2)} — Reprobado`, icon: "close-circle", color: COLORS.red };
  }

  if (allThree20) {
    const needed = calcNeededFor40(g1!, g2!, g3!);
    const currentAvg = calcWeightedAvg(g1, g2, g3, null)!;
    if (needed <= 0) {
      return { text: `Promedio parcial: ${currentAvg.toFixed(2)} — ¡Ya pasaste!`, icon: "party-popper", color: COLORS.success };
    }
    if (needed > 5.0) {
      return { text: `Necesitarías más de 5.0 en el 40%`, icon: "alert-circle", color: COLORS.red };
    }
    return { text: `Necesitas ${needed.toFixed(1)} en el 40% para pasar`, icon: "target", color: COLORS.info };
  }

  const entered = [g1, g2, g3, g4].filter((v) => v != null).length;
  if (entered === 0) {
    return { text: "Toca para registrar calificaciones", icon: "pencil-outline", color: COLORS.textSecondary };
  }

  const avg = calcWeightedAvg(g1, g2, g3, g4);
  return { text: `${entered}/4 notas — Parcial: ${avg?.toFixed(2) || "--"}`, icon: "progress-check", color: COLORS.textSecondary };
}

export default function NotesScreen() {
  const { user } = useAuth();
  const showAlert = useStyledAlert();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [formG1, setFormG1] = useState("");
  const [formG2, setFormG2] = useState("");
  const [formG3, setFormG3] = useState("");
  const [formG4, setFormG4] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const { data: schedRefs } = await supabase
      .from("schedules")
      .select("subject_id")
      .eq("user_id", user.id);

    const scheduledIds = [...new Set((schedRefs || []).map((s: any) => s.subject_id).filter(Boolean))];

    if (scheduledIds.length === 0) {
      setSubjects([]);
      setGrades([]);
      setLoading(false);
      return;
    }

    const [{ data: subjData }, { data: gradesData }] = await Promise.all([
      supabase
        .from("subjects")
        .select("id, name, color, credits")
        .eq("user_id", user.id)
        .in("id", scheduledIds)
        .order("name"),
      supabase
        .from("grades")
        .select("*")
        .eq("user_id", user.id)
        .in("subject_id", scheduledIds),
    ]);

    setSubjects((subjData as any[]) || []);
    setGrades((gradesData as any[]) || []);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const getGradeForSubject = (subjectId: string): GradeItem | undefined => {
    return grades.find((g) => g.subject_id === subjectId);
  };

  const openModal = (subject: SubjectItem) => {
    setEditingSubject(subject);
    const g = getGradeForSubject(subject.id);
    setFormG1(g?.grade_20_1 != null ? String(g.grade_20_1) : "");
    setFormG2(g?.grade_20_2 != null ? String(g.grade_20_2) : "");
    setFormG3(g?.grade_20_3 != null ? String(g.grade_20_3) : "");
    setFormG4(g?.grade_40 != null ? String(g.grade_40) : "");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!editingSubject) return;

    const parse = (v: string): number | null => {
      const trimmed = v.trim();
      if (trimmed === "") return null;
      const n = parseFloat(trimmed.replace(",", "."));
      if (isNaN(n)) return null;
      return Math.max(0, Math.min(5, Math.round(n * 10) / 10));
    };

    const g1 = parse(formG1);
    const g2 = parse(formG2);
    const g3 = parse(formG3);
    const g4 = parse(formG4);

    setSaving(true);
    const { error } = await supabase.from("grades").upsert({
      user_id: user?.id,
      subject_id: editingSubject.id,
      grade_20_1: g1,
      grade_20_2: g2,
      grade_20_3: g3,
      grade_40: g4,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,subject_id" });

    if (error) {
      showAlert({ variant: "error", title: "Error", message: "No se pudo guardar las calificaciones" });
    } else {
      setModalVisible(false);
      await fetchData();
    }
    setSaving(false);
  };

  const subjectGrades = useMemo(() => {
    return subjects.map((subject) => {
      const grade = getGradeForSubject(subject.id);
      const g1 = grade?.grade_20_1 ?? null;
      const g2 = grade?.grade_20_2 ?? null;
      const g3 = grade?.grade_20_3 ?? null;
      const g4 = grade?.grade_40 ?? null;
      const progress = getProgressPercent(g1, g2, g3, g4);
      const status = getStatusText(g1, g2, g3, g4);
      return { subject, g1, g2, g3, g4, progress, status };
    });
  }, [subjects, grades]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {[1, 2, 3].map((i) => <NoteCardSkeleton key={i} />)}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {subjects.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="book-open-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sin materias registradas</Text>
            <Text style={styles.emptySubtitle}>
              Registra tus materias en el horario para poder{"\n"}gestionar tus calificaciones aquí.
            </Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Notas<Text style={styles.redDot}>.</Text>
            </Text>
            <Text style={styles.counter}>
              {subjects.length} materia{subjects.length !== 1 ? "s" : ""} registrada{subjects.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.tabDivider} />

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {subjectGrades.map(({ subject, g1, g2, g3, g4, progress, status }) => {
              return (
                <TouchableOpacity
                  key={subject.id}
                  style={styles.card}
                  onPress={() => openModal(subject)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.subjectDot, { backgroundColor: subject.color || COLORS.primary }]} />
                      <Text style={styles.cardSubjectName}>{subject.name}</Text>
                    </View>
                    <View style={[styles.creditBadge, { backgroundColor: subject.color || COLORS.primary }]}>
                      <Text style={styles.creditBadgeText}>{subject.credits}</Text>
                    </View>
                  </View>

                  <View style={styles.gradeRow}>
                    {([g1, g2, g3, g4] as const).map((val, idx) => {
                      const pct = idx === 3 ? "40%" : "20%";
                      return (
                        <View key={idx} style={styles.gradeSlot}>
                          <Text style={styles.gradeSlotPct}>{pct}</Text>
                          <View style={[styles.gradePill, { backgroundColor: gradeStatusColor(val) + "18" }]}>
                            <Text style={[styles.gradePillText, { color: gradeStatusColor(val) }]}>
                              {gradeLabel(val)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? COLORS.success : COLORS.primary }]} />
                  </View>

                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons name={status.icon} size={16} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Calificaciones</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={styles.modalSave}>{saving ? "..." : "Guardar"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {editingSubject && (
              <View style={styles.modalSubjectHeader}>
                <View style={[styles.subjectDot, { backgroundColor: editingSubject.color || COLORS.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubjectName}>{editingSubject.name}</Text>
                  <Text style={styles.modalSubjectMeta}>{editingSubject.credits} créditos</Text>
                </View>
              </View>
            )}

            {([
              { label: "Primer 20%", value: formG1, setter: setFormG1 },
              { label: "Segundo 20%", value: formG2, setter: setFormG2 },
              { label: "Tercer 20%", value: formG3, setter: setFormG3 },
              { label: "40% Final", value: formG4, setter: setFormG4 },
            ] as const).map(({ label, value, setter }, idx) => (
              <View key={idx} style={styles.formGroup}>
                <Text style={styles.formLabel}>{label}</Text>
                <View style={styles.formInputRow}>
                  <TextInput
                    style={styles.formInput}
                    value={value}
                    onChangeText={setter}
                    placeholder="0.0 - 5.0"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <View style={[styles.formInputBadge, { backgroundColor: value ? gradeStatusColor(parseFloat(value.replace(",", "."))) : COLORS.gradePending }]}>
                    <Text style={styles.formInputBadgeText}>
                      {value && !isNaN(parseFloat(value.replace(",", "."))) ? parseFloat(value.replace(",", ".")).toFixed(1) : "--"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {editingSubject && (() => {
              const g1 = formG1.trim() ? parseFloat(formG1.replace(",", ".")) : null;
              const g2 = formG2.trim() ? parseFloat(formG2.replace(",", ".")) : null;
              const g3 = formG3.trim() ? parseFloat(formG3.replace(",", ".")) : null;
              const g4 = formG4.trim() ? parseFloat(formG4.replace(",", ".")) : null;
              const validG1 = g1 != null && !isNaN(g1) ? g1 : null;
              const validG2 = g2 != null && !isNaN(g2) ? g2 : null;
              const validG3 = g3 != null && !isNaN(g3) ? g3 : null;
              const validG4 = g4 != null && !isNaN(g4) ? g4 : null;

              const avg = calcWeightedAvg(validG1, validG2, validG3, validG4);
              const allThree = validG1 != null && validG2 != null && validG3 != null;
              const allFour = allThree && validG4 != null;

              return (
                <View style={styles.predictionBox}>
                  {avg != null && (
                    <View style={styles.predictionRow}>
                      <MaterialCommunityIcons name="calculator" size={18} color={COLORS.dark} />
                      <Text style={styles.predictionText}>
                        Promedio ponderado: <Text style={styles.predictionBold}>{avg.toFixed(2)}</Text>
                      </Text>
                    </View>
                  )}

                  {allFour ? (
                    <View style={styles.predictionRow}>
                      <MaterialCommunityIcons
                        name={avg! >= PASSING_GRADE ? "check-circle" : "close-circle"}
                        size={18}
                        color={avg! >= PASSING_GRADE ? COLORS.success : COLORS.red}
                      />
                      <Text style={[styles.predictionText, { color: avg! >= PASSING_GRADE ? COLORS.success : COLORS.red }]}>
                        {avg! >= PASSING_GRADE ? "¡Aprobaste la materia!" : "Reprobaste la materia"}
                      </Text>
                    </View>
                  ) : allThree ? (
                    <View style={styles.predictionRow}>
                      <MaterialCommunityIcons name="target" size={18} color={COLORS.info} />
                      {(() => {
                        const needed = calcNeededFor40(validG1!, validG2!, validG3!);
                        if (needed <= 0) {
                          return (
                            <Text style={[styles.predictionText, { color: COLORS.success }]}>
                              ¡Ya tienes promedio aprobado!
                            </Text>
                          );
                        }
                        if (needed > 5.0) {
                          return (
                            <Text style={[styles.predictionText, { color: COLORS.red }]}>
                              Necesitarías más de 5.0 en el 40% — imposible
                            </Text>
                          );
                        }
                        return (
                          <Text style={styles.predictionText}>
                            Necesitas <Text style={styles.predictionBold}>{needed.toFixed(1)}</Text> en el 40% para pasar
                          </Text>
                        );
                      })()}
                    </View>
                  ) : (
                    <View style={styles.predictionRow}>
                      <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.textSecondary} />
                      <Text style={[styles.predictionText, { color: COLORS.textSecondary }]}>
                        Ingresa los tres 20% para ver qué necesitas en el 40%
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 16 },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
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
  tabDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyState: {
    alignItems: "center",
  },
  emptyIconBox: {
    width: 85,
    height: 85,
    borderRadius: 25,
    backgroundColor: COLORS.lightBlue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardSubjectName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  creditBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.white,
  },

  gradeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  gradeSlot: {
    flex: 1,
    alignItems: "center",
  },
  gradeSlotPct: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  gradePill: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  gradePillText: {
    fontSize: 16,
    fontWeight: "800",
  },

  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.divider,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
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

  modalSubjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  modalSubjectName: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  modalSubjectMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  formGroup: { marginBottom: 16 },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  formInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  formInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.dark,
    fontWeight: "600",
  },
  formInputBadge: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  formInputBadgeText: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.white,
  },

  predictionBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 12,
    marginTop: 4,
  },
  predictionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  predictionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  predictionBold: {
    fontWeight: "700",
  },

  bottomSpacing: { height: 60 },
});
