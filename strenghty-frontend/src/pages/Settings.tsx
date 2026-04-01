import { requestNotificationPermission } from "@/lib/notifications";
import { triggerHaptic } from "@/lib/haptics";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Switch } from "@/components/ui/switch";
import {
  loadSettings,
  saveSettings,
  type UserSettings,
  type UnitsPreference,
} from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const { toast } = useToast();

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const toggle = (key: "notifications" | "vibrations") => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      // If enabling notifications, prompt OS/web permission
      try {
        if (
          key === "notifications" &&
          !prev.notifications &&
          updated.notifications
        ) {
          // fire-and-forget
          requestNotificationPermission().catch(() => {});
        }
      } catch {}

      // If enabling vibrations, play a short haptic sample
      try {
        if (key === "vibrations" && !prev.vibrations && updated.vibrations) {
          triggerHaptic(40);
        }
      } catch {}

      return updated;
    });
  };

  const setUnit = (
    field: keyof UnitsPreference,
    value: UnitsPreference[keyof UnitsPreference],
  ) => {
    setSettings((prev) => ({
      ...prev,
      units: {
        ...prev.units,
        [field]: value,
      },
    }));
  };

  return (
    <AppLayout noPaddingTop>
      <main className="w-full max-w-2xl mx-auto px-4 pt-2 pb-32">
        {/* Header */}
        <div className="pb-2">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Adjust notifications, haptics, and measurement units.
          </p>
        </div>

        <div className="space-y-6">
          {/* Preferences */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Preferences
            </h2>
            <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Notifications
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show reminders and important updates.
                  </p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={() => toggle("notifications")}
                />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">Vibration</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use haptic feedback for timers and actions.
                  </p>
                </div>
                <Switch
                  checked={settings.vibrations}
                  onCheckedChange={() => toggle("vibrations")}
                />
              </div>
            </div>
          </section>

          {/* Units */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Units
            </h2>
            <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
              {[
                {
                  label: "Weight",
                  field: "weight" as const,
                  options: ["kg", "lbs"] as const,
                },
                {
                  label: "Distance",
                  field: "distance" as const,
                  options: ["kilometers", "miles"] as const,
                },
                {
                  label: "Body measurements",
                  field: "body" as const,
                  options: ["cm", "in"] as const,
                },
              ].map(({ label, field, options }) => (
                <div
                  key={field}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <div className="flex rounded-lg bg-zinc-900 border border-white/10 p-1">
                    {options.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(field, u)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          settings.units[field] === u
                            ? "bg-orange-500 text-white shadow-sm"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Next Up Suggestions */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Suggestions
            </h2>
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex flex-col gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Next Up suggestions
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show workout recommendations on your dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem("user:hideNextUp");
                    } catch {}
                    toast({
                      title: "Suggestions re-enabled",
                      description: "Next Up suggestions will be shown again.",
                    });
                  }}
                  className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/15 text-orange-400 text-xs font-semibold border border-orange-500/25 hover:bg-orange-500/25 transition-colors"
                >
                  Re-enable suggestions
                </button>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              About
            </h2>
            <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-sm font-semibold text-white">App Version</p>
                <p className="text-sm text-muted-foreground">1.0.0</p>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-sm font-semibold text-white">Built by</p>
                <p className="text-sm text-muted-foreground">Strengthy Team</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
