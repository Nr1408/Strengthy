import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Dumbbell, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Routine } from "@/types/workout";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { loadSettings, saveSettings } from "@/lib/settings";

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { suggestedRoutine?: Routine; label?: string };
  };

  const suggested = location.state?.suggestedRoutine;
  const label =
    location.state?.label ||
    (suggested ? `Next: ${suggested.name}` : "Suggested next workout");

  useEffect(() => {
    const requestIfFirstWorkout = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;

        const isFirstWorkout =
          localStorage.getItem("user:firstWorkoutCompleted") === "1";
        if (!isFirstWorkout) return;

        const alreadyAsked = localStorage.getItem(
          "user:notificationPermissionAsked",
        );
        if (alreadyAsked) return;

        // Mark as asked before requesting so even if user kills app
        // mid-prompt we don't ask again
        localStorage.setItem("user:notificationPermissionAsked", "1");

        // Small delay so the celebration screen renders first
        await new Promise((res) => setTimeout(res, 1500));

        const { display } = await LocalNotifications.checkPermissions();
        if (display === "granted") {
          try {
            const settings = loadSettings();
            saveSettings({ ...settings, notifications: true });
          } catch {}
          return;
        }

        const result = await LocalNotifications.requestPermissions();
        if (result.display === "granted") {
          try {
            const settings = loadSettings();
            saveSettings({ ...settings, notifications: true });
          } catch {}
        }
      } catch {
        // Never crash the celebration screen over a notification error
      }
    };

    requestIfFirstWorkout();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-orange-500/8 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Hero celebration block */}
        <div className="text-center space-y-3 pb-2">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 shadow-lg shadow-orange-500/30">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-white">
              Workout Complete!
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Great session. Keep the momentum going.
            </p>
          </div>
        </div>

        {/* What's next card */}
        {suggested && (
          <div className="rounded-2xl bg-gradient-to-r from-orange-500/15 to-orange-600/5 border border-orange-500/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-400 mb-0.5 uppercase tracking-wider font-medium">
                  Suggested next workout
                </p>
                <p className="font-semibold text-white">{suggested.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {suggested.exercises?.length || 0} exercises
                </p>
              </div>
              <div className="shrink-0 h-10 w-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-orange-400" />
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          {suggested && (
            <button
              type="button"
              onClick={() =>
                navigate(`/routines/${suggested.id}/view`, {
                  state: { routine: suggested },
                })
              }
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
            >
              View Next Workout
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-sm transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/workouts")}
            className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors pt-1"
          >
            View workout history
          </button>
        </div>
      </div>
    </div>
  );
}
