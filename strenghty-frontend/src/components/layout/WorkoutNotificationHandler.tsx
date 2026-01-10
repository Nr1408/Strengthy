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

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) return;

    let removeAppStateListener: (() => void) | undefined;
    let removeNotificationListener: (() => void) | undefined;

    const ensurePermission = async () => {
      try {
        const settings = loadSettings();
        if (!settings.notifications) return false;

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === "granted") return true;
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

    // When user taps the notification, navigate back to the workout
    LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        try {
          const route =
            (event.notification &&
              event.notification.extra &&
              (event.notification.extra as any).route) ||
            "/workouts/new";
          navigate(route);
        } catch {
          navigate("/workouts/new");
        }
      }
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
