import { useCallback, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import {
  rescheduleAllNotifications,
  scheduleSingleActivityNotifications,
  cancelSingleActivityNotifications,
} from "@/src/lib/notifications";

export function useNotifications(userId: string | undefined) {
  const refreshNotifications = useCallback(async () => {
    if (!userId) return;

    const [{ data: schedData }, { data: actData }] = await Promise.all([
      supabase
        .from("schedules")
        .select("id, day_of_week, start_time, classroom, subjects(name)")
        .eq("user_id", userId),
      supabase
        .from("activities")
        .select("id, type, title, due_date, due_time, subject_id, subjects(name)")
        .eq("user_id", userId)
        .eq("completed", false),
    ]);

    await rescheduleAllNotifications(
      (schedData as any[]) || [],
      (actData as any[]) || [],
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const activitiesChannel = supabase
      .channel("activities-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities", filter: `user_id=eq.${userId}` },
        async (payload) => {
          console.log("[Realtime] Activity change:", payload.eventType, payload.new);
          if (payload.eventType === "DELETE" || payload.old) {
            const oldId = (payload.old as any)?.id;
            if (oldId) cancelSingleActivityNotifications(oldId);
          }
          if (payload.eventType !== "DELETE" && payload.new) {
            const newAct = payload.new as any;
            if (!newAct.completed) {
              await scheduleSingleActivityNotifications(newAct);
            } else {
              cancelSingleActivityNotifications(newAct.id);
            }
          }
        },
      )
      .subscribe();

    return () => {
      activitiesChannel.unsubscribe();
    };
  }, [userId]);

  return { refreshNotifications };
}
