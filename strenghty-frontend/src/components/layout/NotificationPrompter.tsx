import { useEffect } from "react";
import { loadSettings } from "@/lib/settings";
import { requestNotificationPermission } from "@/lib/notifications";

// Component mounted at app root to proactively prompt for notification permission
export default function NotificationPrompter() {
  useEffect(() => {
    (async () => {
      try {
        const settings = loadSettings();
        if (!settings.notifications) return;

        // Respect onboarding-first flow for brand-new users: don't prompt
        // until they complete onboarding.
        try {
          const onboarding = localStorage.getItem("user:onboarding");
          const firstDone = localStorage.getItem("user:firstWorkoutCompleted");
          if (onboarding && !firstDone) return;
        } catch {}

        // If we've already asked, or permission is already granted, do nothing.
        try {
          const alreadyAsked = localStorage.getItem(
            "user:notificationPermissionAsked",
          );
          if (alreadyAsked) return;
        } catch {}

        // Fire the native/web permission prompt
        // We don't await the result beyond recording it in the helper.
        await requestNotificationPermission();
      } catch {}
    })();
  }, []);

  return null;
}
