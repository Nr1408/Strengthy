import { loadSettings } from "@/lib/settings";

// Trigger a light haptic/vibration if enabled in settings.
export function triggerHaptic(pattern: number | number[] = 20) {
  try {
    const settings = loadSettings();
    if (!settings.vibrations) return;
  } catch {
    // if settings can't be read, fail silently
    return;
  }

  // First try the Capacitor Haptics surface if it's been registered on
  // the global `Capacitor` object (common when native plugins are synced).
  try {
    const w: any = window as any;
    const haptics = w?.Capacitor?.Haptics;
    if (haptics && typeof haptics.impact === "function") {
      haptics.impact({ style: "light" });
      return;
    }
  } catch {
    // fall through to dynamic import / navigator vibration
  }

  // If the plugin isn't available on window, attempt a dynamic import
  // of the official Capacitor Haptics plugin. This handles environments
  // where the plugin is bundled but not attached to window.
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    import("@capacitor/haptics")
      .then((mod: any) => {
        const Haptics = mod && (mod.Haptics || mod.default?.Haptics || mod);
        if (Haptics && typeof Haptics.impact === "function") {
          try {
            Haptics.impact({ style: "light" });
          } catch {
            // ignore plugin runtime errors
          }
        }
      })
      .catch(() => {
        // dynamic import failed; will try navigator.vibrate below
      });
  } catch {
    // ignore
  }

  // Fallback to the standard vibration API if available (webview).
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).vibrate(pattern);
    }
  } catch {
    // ignore
  }
}
