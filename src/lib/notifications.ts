import { Platform } from "react-native";

let Notifications: any = null;

try {
  Notifications = require("expo-notifications");
} catch {
  // Notifications not available in Expo Go, will work in development builds
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermissions() {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

function toWeekday(dayOfWeek: number): number {
  return dayOfWeek === 7 ? 1 : dayOfWeek + 1;
}

export async function rescheduleAllNotifications(
  schedules: {
    id: string;
    day_of_week: number;
    start_time: string;
    subjects?: { name: string } | null;
    classroom?: string | null;
  }[],
  activities: {
    id: string;
    type: string;
    title: string;
    due_date: string;
    due_time?: string | null;
    subjects?: { name: string } | null;
  }[],
) {
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}

  for (const s of schedules) {
    if (!s.start_time || !s.day_of_week) continue;

    const [h, m] = s.start_time.split(":").map(Number);
    let notifMin = m - 20;
    let notifHour = h;
    if (notifMin < 0) {
      notifHour -= 1;
      notifMin += 60;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `class-${s.id}`,
        content: {
          title: `Clase de ${s.subjects?.name || "Sin materia"}`,
          body: `En 20 minutos en ${s.classroom || "Sin salón"}`,
          ...(Platform.OS === "ios" ? { sound: "default" } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toWeekday(s.day_of_week),
          hour: notifHour,
          minute: notifMin,
        },
      });
    } catch {}
  }

  for (const a of activities) {
    if (!a.due_date) continue;

    const datePart = a.due_date;
    const timePart = a.due_time || "23:59";
    const [th, tm] = timePart.split(":").map(Number);
    const dueDateTime = new Date(`${datePart}T${String(th).padStart(2, "0")}:${String(tm).padStart(2, "0")}:00`);

    const oneDayBefore = new Date(dueDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (oneDayBefore.getTime() > Date.now()) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `activity-1d-${a.id}`,
          content: {
            title: `Mañana: ${a.title}`,
            body: `${a.subjects?.name || "Sin materia"} — ${a.type === "parcial" ? "Parcial" : "Tarea"}`,
            ...(Platform.OS === "ios" ? { sound: "default" } : {}),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: oneDayBefore },
        });
      } catch {}
    }

    const oneHourBefore = new Date(dueDateTime.getTime() - 60 * 60 * 1000);
    if (oneHourBefore.getTime() > Date.now()) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `activity-1h-${a.id}`,
          content: {
            title: `En 1 hora: ${a.title}`,
            body: `${a.subjects?.name || "Sin materia"} — ${a.type === "parcial" ? "Parcial" : "Tarea"}`,
            ...(Platform.OS === "ios" ? { sound: "default" } : {}),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: oneHourBefore },
        });
      } catch {}
    }
  }
}
