import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

if (Platform.OS !== "web") {
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
  if (Platform.OS === "web") return false;
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

function scheduleClassNotification(s: {
  id: string;
  day_of_week: number;
  start_time: string;
  subjects?: { name: string } | null;
  classroom?: string | null;
}) {
  if (!s.start_time || !s.day_of_week) return;

  const [h, m] = s.start_time.split(":").map(Number);
  let notifMin = m - 20;
  let notifHour = h;
  if (notifMin < 0) {
    notifHour -= 1;
    notifMin += 60;
  }
  if (notifHour < 0) notifHour = 23;

  const identifier = `class-${s.id}`;

  return Notifications.scheduleNotificationAsync({
    identifier,
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
}

function scheduleActivityNotifications(a: {
  id: string;
  type: string;
  title: string;
  due_date: string;
  due_time?: string | null;
  subjects?: { name: string } | null;
}) {
  if (!a.due_date) return;

  const datePart = a.due_date;
  const timePart = a.due_time || "23:59";
  const [th, tm] = timePart.split(":").map(Number);
  const dueDateTime = new Date(
    `${datePart}T${String(th).padStart(2, "0")}:${String(tm).padStart(2, "0")}:00`,
  );

  const oneDayBefore = new Date(dueDateTime.getTime() - 24 * 60 * 60 * 1000);
  const oneHourBefore = new Date(dueDateTime.getTime() - 60 * 60 * 1000);
  const now = Date.now();

  const typeLabel = a.type === "parcial" ? "Parcial" : "Tarea";
  const subjectName = a.subjects?.name || "Sin materia";

  const promises: Promise<string>[] = [];

  if (oneDayBefore.getTime() > now) {
    promises.push(
      Notifications.scheduleNotificationAsync({
        identifier: `activity-1d-${a.id}`,
        content: {
          title: `Mañana: ${a.title}`,
          body: `${subjectName} — ${typeLabel}`,
          ...(Platform.OS === "ios" ? { sound: "default" } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: oneDayBefore },
      }),
    );
  }

  if (oneHourBefore.getTime() > now) {
    promises.push(
      Notifications.scheduleNotificationAsync({
        identifier: `activity-1h-${a.id}`,
        content: {
          title: `En 1 hora: ${a.title}`,
          body: `${subjectName} — ${typeLabel}`,
          ...(Platform.OS === "ios" ? { sound: "default" } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: oneHourBefore },
      }),
    );
  }

  return Promise.all(promises);
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
  if (Platform.OS === "web") return;

  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const existingIds = new Set(existing.map((n: Notifications.NotificationRequest) => n.identifier));

    const expectedClassIds = new Set(schedules.map((s) => `class-${s.id}` as const));
    const expectedActivityIds = new Set(
      activities.flatMap((a) => [`activity-1d-${a.id}` as const, `activity-1h-${a.id}` as const]),
    );

    for (const id of existingIds) {
      if (!expectedClassIds.has(id as any) && !expectedActivityIds.has(id as any)) {
        await Notifications.cancelScheduledNotificationAsync(id as string);
      }
    }

    for (const s of schedules) {
      const id = `class-${s.id}`;
      const exists = existingIds.has(id);
      if (!exists) {
        try {
          await scheduleClassNotification(s);
          console.log(`[Notification] Scheduled class: ${id}`);
        } catch (error) {
          console.error(`[Notification] Failed to schedule class ${id}:`, error);
        }
      }
    }

    for (const a of activities) {
      try {
        await scheduleActivityNotifications(a);
        console.log(`[Notification] Scheduled activity: ${a.id}`);
      } catch (error) {
        console.error(`[Notification] Failed to schedule activity ${a.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Notification] Error rescheduling notifications:", error);
  }
}

export async function scheduleSingleClassNotification(s: {
  id: string;
  day_of_week: number;
  start_time: string;
  subjects?: { name: string } | null;
  classroom?: string | null;
}) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`class-${s.id}`);
    await scheduleClassNotification(s);
    console.log(`[Notification] Updated class: ${s.id}`);
  } catch (error) {
    console.error(`[Notification] Failed to update class ${s.id}:`, error);
  }
}

export async function cancelSingleClassNotification(id: string) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`class-${id}`);
    console.log(`[Notification] Canceled class: ${id}`);
  } catch (error) {
    console.error(`[Notification] Failed to cancel class ${id}:`, error);
  }
}

export async function scheduleSingleActivityNotifications(a: {
  id: string;
  type: string;
  title: string;
  due_date: string;
  due_time?: string | null;
  subjects?: { name: string } | null;
}) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`activity-1d-${a.id}`);
    await Notifications.cancelScheduledNotificationAsync(`activity-1h-${a.id}`);
    await scheduleActivityNotifications(a);
    console.log(`[Notification] Updated activity: ${a.id}`);
  } catch (error) {
    console.error(`[Notification] Failed to update activity ${a.id}:`, error);
  }
}

export async function cancelSingleActivityNotifications(id: string) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`activity-1d-${id}`);
    await Notifications.cancelScheduledNotificationAsync(`activity-1h-${id}`);
    console.log(`[Notification] Canceled activity: ${id}`);
  } catch (error) {
    console.error(`[Notification] Failed to cancel activity ${id}:`, error);
  }
}
