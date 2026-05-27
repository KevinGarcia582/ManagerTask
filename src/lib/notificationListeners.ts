import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

let notificationListener: Notifications.Subscription | null = null;
let responseListener: Notifications.Subscription | null = null;

export function setupNotificationListeners() {
  notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log("[Notification] Received:", notification.request.identifier);
  });

  responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    const notif = response.notification;
    const identifier = notif.request.identifier;
    console.log("[Notification] Response:", identifier);

    if (identifier.startsWith("class-")) {
      router.replace("/(tabs)/schedule");
    } else if (identifier.startsWith("activity-")) {
      router.replace("/(tabs)/tasks");
    }
  });

  return () => {
    if (notificationListener) {
      Notifications.removeNotificationSubscription(notificationListener);
      notificationListener = null;
    }
    if (responseListener) {
      Notifications.removeNotificationSubscription(responseListener);
      responseListener = null;
    }
  };
}

export async function getPendingNotifications() {
  if (Platform.OS === "web") return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("[Notification] Error getting pending notifications:", error);
    return [];
  }
}

export async function cancelNotification(identifier: string) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error(`[Notification] Error canceling ${identifier}:`, error);
  }
}
