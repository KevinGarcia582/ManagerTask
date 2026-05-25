import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY_COMPLETE = "@managertask_onboarding_complete";
const KEY_STEP = "@managertask_onboarding_step";

let restartCallback: (() => void) | null = null;
let pendingRestart = false;

export function triggerOnboardingRestart() {
  if (restartCallback) {
    restartCallback();
  } else {
    pendingRestart = true;
  }
}

export interface TourStep {
  tab: string;
  route: string;
  title: string;
  subtitle: string;
  details: string[];
  icon: any;
  owlPosition: { top: string; left?: string; right?: string };
  tooltipPosition: "top" | "bottom";
}

export const TOUR_STEPS: TourStep[] = [
  {
    tab: "Inicio",
    route: "/(tabs)",
    title: "Inicio",
    subtitle: "Tu panel de control con el resumen diario de tu vida académica.",
    details: [
      "Al abrir la app llegas aquí: ves tus clases de hoy con materia, hora y salón asignado.",
      "Debajo encuentras tus próximas 5 actividades pendientes con fechas relativas (Hoy, Mañana, etc.).",
      "El badge de carga académica te indica si tu semana es Ligera, Moderada o Pesada según las horas de clase.",
      "Desliza hacia abajo para refrescar los datos en cualquier momento.",
      "Usa el botón 'Guíame Búho' en la parte superior derecha para volver a ver este recorrido cuando quieras.",
    ],
    icon: "home-outline",
    owlPosition: { top: "6%", right: "6%" },
    tooltipPosition: "bottom",
  },
  {
    tab: "Horario",
    route: "/(tabs)/schedule",
    title: "Horario",
    subtitle: "Organiza tu semana de clases con un calendario visual por días.",
    details: [
      "Navega entre pares de días (Lun‑Mar, Mié‑Jue, Vie‑Sáb, Dom) usando las flechas en la tarjeta superior.",
      "Cada bloque de clase muestra la materia y el salón. El color del borde indica los créditos: verde (≤2), naranja (≤3), rojo (>3).",
      "Mantén presionado un bloque para editar sus datos: materia, día, hora de inicio, hora de fin y salón.",
      "Explora las materias de tu programa por semestre: selecciona un semestre, luego toca una materia para agregarla a tu horario.",
      "Usa el botón 'Cargar materias' para agregar varias materias a la vez desde el catálogo oficial de tu universidad.",
      "Alterna entre modo edición y modo visual con el botón 'Editar horario' / 'Guardar Horario' al final de la pantalla.",
    ],
    icon: "calendar-month-outline",
    owlPosition: { top: "22%", left: "50%" },
    tooltipPosition: "top",
  },
  {
    tab: "Tareas",
    route: "/(tabs)/tasks",
    title: "Tareas",
    subtitle: "Gestiona todas tus actividades académicas en un solo lugar.",
    details: [
      "Crea actividades de tipo Tarea o Parcial con título, descripción, materia, fecha de entrega y hora.",
      "Asigna una prioridad a cada actividad: baja, media o alta para organizar tu carga de trabajo.",
      "Selecciona la materia del menú desplegable: solo aparecen las que tienes registradas en tu horario.",
      "Usa los filtros Todas / Pendientes / Completadas para ver solo lo que necesitas en cada momento.",
      "El contador superior te muestra tu progreso actual: pendientes · completadas.",
      "Toca el botón circular + para crear una nueva actividad rápidamente (se oculta al hacer scroll).",
      "Toca una tarjeta para editar sus datos, mantén presionado para eliminarla con confirmación.",
      "Marca una actividad como completada tocando el círculo junto al título.",
    ],
    icon: "clipboard-text-outline",
    owlPosition: { top: "12%", right: "8%" },
    tooltipPosition: "bottom",
  },
  {
    tab: "Notas",
    route: "/(tabs)/notes",
    title: "Notas",
    subtitle: "Registra tus calificaciones y calcula automáticamente qué necesitas para pasar.",
    details: [
      "Cada materia de tu horario tiene 4 espacios de calificación: tres parciales del 20% y un examen final del 40%.",
      "Toca la tarjeta de una materia para abrir el editor de notas e ingresar valores entre 0.0 y 5.0.",
      "Los colores te indican el estado de cada nota: verde (≥4.0 excelente), azul (≥3.0 aprobado), rojo (<3.0 reprobado).",
      "Al ingresar los tres 20%, la app calcula automáticamente qué nota necesitas en el 40% para aprobar con 3.0.",
      "La barra de progreso te muestra visualmente qué tan cerca estás de pasar la materia.",
      "Si ya tienes promedio aprobado sin necesidad del 40%, te lo indica con un mensaje de celebración.",
      "El dropdown de materias solo muestra las que tienes registradas en tu horario académico.",
      "Las notas se guardan automáticamente al tocar Guardar. Puedes editarlas cuando quieras.",
    ],
    icon: "note-text-outline",
    owlPosition: { top: "38%", left: "50%" },
    tooltipPosition: "top",
  },
  {
    tab: "Estadísticas",
    route: "/(tabs)/stats",
    title: "Estadísticas",
    subtitle: "Visualiza el rendimiento de todas tus actividades en tiempo real.",
    details: [
      "El panel superior de 4 tarjetas muestra tus métricas principales: Total de actividades, Completadas, Pendientes y Vencidas.",
      "Las actividades vencidas son aquellas cuya fecha de entrega ya pasó y aún no han sido completadas.",
      "La tasa de completación muestra el porcentaje de actividades terminadas con una barra de progreso verde.",
      "Todos los datos provienen directamente de las actividades que creas en la pestaña Tareas.",
      "Los números se actualizan automáticamente cada vez que entras a esta sección.",
      "Cuando no tienes actividades registradas, verás un estado vacío que te invita a crear tu primera tarea.",
    ],
    icon: "chart-bar",
    owlPosition: { top: "40%", left: "50%" },
    tooltipPosition: "top",
  },
  {
    tab: "Perfil",
    route: "/(tabs)/profile",
    title: "Perfil",
    subtitle: "Tu información personal y académica, siempre a mano.",
    details: [
      "Tu avatar muestra las iniciales de tu nombre en un círculo azul. Debajo ves tu nombre completo y correo electrónico.",
      "La barra de estadísticas rápidas resume tu actividad en la app: total, completadas y pendientes.",
      "La tarjeta de información muestra tu Programa Académico, Semestre y Correo registrado.",
      "Toca 'Editar perfil' para modificar tu nombre, programa académico o semestre actual.",
      "En el editor puedes seleccionar tu semestre de una cuadrícula visual del 1° al 10°.",
      "El botón de cerrar sesión te permite salir de tu cuenta de forma segura con confirmación previa.",
      "Al cerrar sesión volverás a la pantalla de inicio de sesión para ingresar con otra cuenta.",
    ],
    icon: "account-outline",
    owlPosition: { top: "20%", left: "50%" },
    tooltipPosition: "top",
  },
];

export function useOnboarding() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const stepRef = useRef(0);
  stepRef.current = currentStep;

  useEffect(() => {
    (async () => {
      try {
        const complete = await AsyncStorage.getItem(KEY_COMPLETE);
        if (complete === "true") {
          setReady(true);
          return;
        }
        const stepStr = await AsyncStorage.getItem(KEY_STEP);
        const step = stepStr ? parseInt(stepStr, 10) : 0;
        if (step >= TOUR_STEPS.length) {
          await AsyncStorage.setItem(KEY_COMPLETE, "true");
          setReady(true);
          return;
        }
        setCurrentStep(step);
        setTimeout(() => {
          router.replace(TOUR_STEPS[step].route as any);
        }, 100);
        setReady(true);
        setTimeout(() => setIsActive(true), 600);
      } catch (e) {
        console.warn("Onboarding init error:", e);
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToStep = useCallback(async (step: number) => {
    if (step >= TOUR_STEPS.length) {
      try { await AsyncStorage.setItem(KEY_COMPLETE, "true"); } catch {}
      try { await AsyncStorage.setItem(KEY_STEP, "0"); } catch {}
      setIsActive(false);
      return;
    }
    setCurrentStep(step);
    router.replace(TOUR_STEPS[step].route as any);
    try { await AsyncStorage.setItem(KEY_STEP, String(step)); } catch {}
  }, [router]);

  const nextStep = useCallback(() => {
    navigateToStep(stepRef.current + 1);
  }, [navigateToStep]);

  const prevStep = useCallback(() => {
    if (stepRef.current > 0) {
      navigateToStep(stepRef.current - 1);
    }
  }, [navigateToStep]);

  const skip = useCallback(async () => {
    try { await AsyncStorage.setItem(KEY_STEP, String(stepRef.current)); } catch {}
    setIsActive(false);
  }, []);

  const dismiss = useCallback(async () => {
    try { await AsyncStorage.setItem(KEY_COMPLETE, "true"); } catch {}
    setIsActive(false);
  }, []);

  const restart = useCallback(async () => {
    try { await AsyncStorage.removeItem(KEY_COMPLETE); } catch {}
    try { await AsyncStorage.removeItem(KEY_STEP); } catch {}
    setCurrentStep(0);
    router.replace(TOUR_STEPS[0].route as any);
    setReady(true);
    setTimeout(() => setIsActive(true), 400);
  }, [router]);

  useEffect(() => {
    restartCallback = restart;
    if (pendingRestart) {
      pendingRestart = false;
      restart();
    }
    return () => { restartCallback = null; };
  }, [restart]);

  return {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    stepInfo: TOUR_STEPS[currentStep],
    ready,
    nextStep,
    prevStep,
    skip,
    dismiss,
    restart,
  };
}
