import { useCallback } from "react";
import { supabase } from "@/src/lib/supabase";
import { rescheduleAllNotifications } from "@/src/lib/notifications";

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

  return { refreshNotifications };
}
