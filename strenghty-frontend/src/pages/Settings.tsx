import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Switch } from "@/components/ui/switch";
import {
  loadSettings,
  saveSettings,
  type UserSettings,
  type UnitsPreference,
} from "@/lib/settings";

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const toggle = (key: "notifications" | "vibrations") => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setUnit = (
    field: keyof UnitsPreference,
    value: UnitsPreference[keyof UnitsPreference]
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
    <AppLayout>
      <main className="w-full max-w-2xl mx-auto px-4 pb-32">
        {/* Header */}
        <div className="pt-6 pb-2">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust notifications, haptics, and measurement units.
          </p>
        </div>

        <div className="space-y-6 mt-6">
          {/* Preferences */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Preferences
            </h2>
            <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">Notifications</p>
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
                { label: "Weight", field: "weight" as const, options: ["kg", "lbs"] as const },
                { label: "Distance", field: "distance" as const, options: ["kilometers", "miles"] as const },
                { label: "Body measurements", field: "body" as const, options: ["cm", "in"] as const },
              ].map(({ label, field, options }) => (
                <div key={field} className="flex items-center justify-between px-5 py-4">
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
