import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { loadSettings } from "@/lib/settings";
import { hasInProgressWorkout } from "@/lib/utils";

const NOTIFICATION_ID = 1001;

export default function WorkoutNotificationHandler() {
  const navigate = useNavigate();
  const hasScheduledRef = useRef(false);
  const STORAGE_KEY = "workout:pauseNotificationScheduled";

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) return;

    let removeAppStateListener: (() => void) | undefined;
    let removeNotificationListener: (() => void) | undefined;

    const ensurePermission = async () => {
      try {
        const settings = loadSettings();
        if (!settings.notifications) return false;

        // Don't ask for permission until after the first workout
        const firstDone = localStorage.getItem("user:firstWorkoutCompleted");
        if (!firstDone) return false;

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === "granted") return true;

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
    };

    const schedulePausedNotification = async () => {
      try {
        const settings = loadSettings();
        if (!settings.notifications) return;
        if (!hasInProgressWorkout()) return;

        const ok = await ensurePermission();
        if (!ok) return;

        // Reconcile in-memory flag with delivered notifications in case
        // the user cleared the notification from the system while the
        // app was backgrounded.
        if (hasScheduledRef.current) {
          try {
            const delivered =
              await LocalNotifications.getDeliveredNotifications();
            const found = (delivered.notifications || []).some(
              (n: any) => Number(n.id) === NOTIFICATION_ID,
            );
            if (!found) {
              hasScheduledRef.current = false;
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {}
            }
          } catch {}
        }

        // Avoid scheduling duplicates
        if (hasScheduledRef.current) return;

        await LocalNotifications.cancel({
          notifications: [{ id: NOTIFICATION_ID }],
        });

        await LocalNotifications.schedule({
          notifications: [
            {
              id: NOTIFICATION_ID,
              title: "Workout paused",
              body: "Tap to return back to the workout",
              extra: {
                route: "/workouts/new",
                fromNotification: "workoutPaused",
              },
            },
          ],
        });

        hasScheduledRef.current = true;
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {}
      } catch {
        // ignore notification errors
      }
    };

    const clearNotification = async () => {
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: NOTIFICATION_ID }],
        });
      } catch {
        // ignore
      }
      hasScheduledRef.current = false;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    };

    // Listen for app going to background/foreground
    App.addListener("appStateChange", (state) => {
      if (state.isActive) {
        clearNotification();
      } else {
        schedulePausedNotification();
      }
    }).then((handle) => {
      removeAppStateListener = () => handle.remove();
    });

    // When the notification is acted on (tap) or otherwise changed,
    // clear our scheduled flag and navigate if appropriate.
    LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        try {
          // If this was our paused notification, clear the scheduled flag
          const nid =
            event?.notification && (event.notification.id as unknown as number);
          if (Number(nid) === NOTIFICATION_ID) {
            hasScheduledRef.current = false;
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {}
          }

          // Mark that the user requested resume so the workout page can
          // clear the paused flag and resume the timer automatically.
          try {
            localStorage.setItem("workout:resumeRequested", "1");
            localStorage.removeItem("workout:paused");
          } catch {}

          const route =
            (event.notification &&
              event.notification.extra &&
              (event.notification.extra as any).route) ||
            "/workouts/new";
          navigate(route);
        } catch {
          navigate("/workouts/new");
        }
      },
    ).then((handle) => {
      removeNotificationListener = () => handle.remove();
    });

    return () => {
      try {
        if (removeAppStateListener) removeAppStateListener();
      } catch {}
      try {
        if (removeNotificationListener) removeNotificationListener();
      } catch {}
    };
  }, [navigate]);

  return null;
}
