import { LocalNotifications } from "@capacitor/local-notifications";
import { loadSettings } from "@/lib/settings";

const isNative = () =>
  typeof window !== "undefined" &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

// IDs must not clash with existing NOTIFICATION_ID = 1001
const NOTIF_IDS = {
  WORKOUT_DAY_BASE: 2000, // 2000-2006 for Mon-Sun
  WEEKLY_NUDGE: 3000,
  STREAK_AT_RISK: 3001,
  STREAK_CELEBRATION: 3002,
};

async function checkPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const settings = loadSettings();
    if (!settings.notifications) return false;
    const { display } = await LocalNotifications.checkPermissions();
    if (display === "granted") return true;

    // Only request if we've already shown the system prompt once
    // (handled by WorkoutComplete after first workout)
    const alreadyAsked = localStorage.getItem(
      "user:notificationPermissionAsked",
    );
    if (!alreadyAsked) return false;

    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch {
    return false;
  }
}

/**
 * Schedule weekly repeating reminders for each scheduled workout day.
 * Fires at reminderHour:reminderMinute every week on that day.
 */
export async function scheduleWorkoutDayReminders(
  scheduledDays: number[], // 0=Sun, 1=Mon ... 6=Sat
  routineNames: Record<number, string>,
  reminderHour = 8,
  reminderMinute = 0,
) {
  if (!isNative()) return;
  try {
    // Cancel existing workout day reminders
    await LocalNotifications.cancel({
      notifications: scheduledDays.map((d) => ({
        id: NOTIF_IDS.WORKOUT_DAY_BASE + d,
      })),
    }).catch(() => {});

    const notifications = scheduledDays.map((dayOfWeek) => {
      const now = new Date();
      const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
      const scheduleDate = new Date(now);
      scheduleDate.setDate(now.getDate() + daysUntil);
      scheduleDate.setHours(reminderHour, reminderMinute, 0, 0);

      const routineName = routineNames[dayOfWeek] || "your workout";

      return {
        id: NOTIF_IDS.WORKOUT_DAY_BASE + dayOfWeek,
        title: "Time to train 💪",
        body: `Today's session: ${routineName}. Let's get it!`,
        schedule: {
          at: scheduleDate,
          repeats: true,
          every: "week" as const,
        },
        sound: undefined,
        actionTypeId: "",
        extra: { type: "workout_day", dayOfWeek },
      };
    });

    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.error("scheduleWorkoutDayReminders error", e);
  }
}

/**
 * Schedule a mid-week nudge on Wednesday at 6 PM
 * if user is still behind their weekly target.
 * Call this after every workout save.
 */
export async function scheduleWeeklyNudge(
  workoutsThisWeek: number,
  weeklyTarget: number,
) {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: NOTIF_IDS.WEEKLY_NUDGE }],
    }).catch(() => {});

    const remaining = weeklyTarget - workoutsThisWeek;
    if (remaining <= 0) return;

    const now = new Date();
    const daysUntilWed = (3 - now.getDay() + 7) % 7;
    if (daysUntilWed === 0 && now.getHours() >= 18) return;

    const wednesday = new Date(now);
    wednesday.setDate(now.getDate() + daysUntilWed);
    wednesday.setHours(18, 0, 0, 0);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIF_IDS.WEEKLY_NUDGE,
          title: "Halfway through the week 📅",
          body:
            remaining === 1
              ? "Just 1 more workout to hit your weekly target!"
              : `${remaining} workouts left to hit your goal this week. You've got this!`,
          schedule: { at: wednesday },
          sound: undefined,
          actionTypeId: "",
          extra: { type: "weekly_nudge" },
        },
      ],
    });
  } catch (e) {
    console.error("scheduleWeeklyNudge error", e);
  }
}

/**
 * Schedule a streak-at-risk warning for Sunday at 10 AM
 * if user hasn't hit their weekly target yet.
 */
export async function scheduleStreakAtRiskWarning(
  workoutsThisWeek: number,
  weeklyTarget: number,
  currentStreak: number,
) {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: NOTIF_IDS.STREAK_AT_RISK }],
    }).catch(() => {});

    const remaining = weeklyTarget - workoutsThisWeek;
    if (remaining <= 0) return;

    const now = new Date();
    const daysUntilSun = (7 - now.getDay()) % 7 || 7;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + daysUntilSun);
    sunday.setHours(10, 0, 0, 0);

    const streakMsg =
      currentStreak > 0
        ? `Your ${currentStreak}-week streak is at risk! `
        : "";

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIF_IDS.STREAK_AT_RISK,
          title: "⚠️ Streak at risk!",
          body:
            streakMsg +
            `${remaining} workout${remaining > 1 ? "s" : ""} left to save your week.`,
          schedule: { at: sunday },
          sound: undefined,
          actionTypeId: "",
          extra: { type: "streak_at_risk" },
        },
      ],
    });
  } catch (e) {
    console.error("scheduleStreakAtRiskWarning error", e);
  }
}

/**
 * Fire an immediate celebration notification 2 seconds after
 * completing the weekly target.
 */
export async function fireStreakCelebration(newStreakWeeks: number) {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: NOTIF_IDS.STREAK_CELEBRATION }],
    }).catch(() => {});

    const at = new Date(Date.now() + 2000);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIF_IDS.STREAK_CELEBRATION,
          title: "Weekly target smashed! 🔥",
          body:
            newStreakWeeks > 1
              ? `${newStreakWeeks} weeks in a row — you're on fire!`
              : "You hit your target this week! Keep the momentum going.",
          schedule: { at },
          sound: undefined,
          actionTypeId: "",
          extra: { type: "streak_celebration" },
        },
      ],
    });
  } catch (e) {
    console.error("fireStreakCelebration error", e);
  }
}

/**
 * Master scheduler — call this on Dashboard mount and after every workout save.
 * Handles all 4 notification types intelligently.
 */
export async function rescheduleAllNotifications(params: {
  scheduledDays: number[];
  routineNames: Record<number, string>;
  workoutsThisWeek: number;
  weeklyTarget: number;
  currentStreak: number;
  justCompletedWeeklyTarget: boolean;
  reminderHour?: number;
  reminderMinute?: number;
}) {
  if (!isNative()) return;

  // Don't schedule anything until first workout is done
  try {
    const firstDone = localStorage.getItem("user:firstWorkoutCompleted");
    if (!firstDone) return;
  } catch {}

  const granted = await checkPermission();
  if (!granted) return;

  await scheduleWorkoutDayReminders(
    params.scheduledDays,
    params.routineNames,
    params.reminderHour ?? 8,
    params.reminderMinute ?? 0,
  );

  await scheduleWeeklyNudge(params.workoutsThisWeek, params.weeklyTarget);

  await scheduleStreakAtRiskWarning(
    params.workoutsThisWeek,
    params.weeklyTarget,
    params.currentStreak,
  );

  if (params.justCompletedWeeklyTarget) {
    await fireStreakCelebration(params.currentStreak);
  }
}

/**
 * Prompt the OS/web to request notification permission from the user.
 * Returns true when permission is granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Native (Capacitor) path
    if (isNative()) {
      try {
        const req = await LocalNotifications.requestPermissions();
        try {
          localStorage.setItem("user:notificationPermissionAsked", "1");
        } catch {}
        return req.display === "granted";
      } catch {
        // fallthrough to web fallback
      }
    }

    // Web fallback
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await (Notification as any).requestPermission();
        try {
          localStorage.setItem("user:notificationPermissionAsked", "1");
        } catch {}
        return res === "granted";
      } catch {
        return false;
      }
    }

    return false;
  } catch {
    return false;
  }
}
