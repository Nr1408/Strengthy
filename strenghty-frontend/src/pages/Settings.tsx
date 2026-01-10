import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-white mb-1">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Adjust notifications, haptics, and measurement units.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Preferences</h2>
          <div className="flex items-center justify-between rounded-xl border border-border bg-neutral-900/60 px-4 py-3">
            <div>
              <Label className="text-base text-white">Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show reminders and important updates.
              </p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={() => toggle("notifications")}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-neutral-900/60 px-4 py-3">
            <div>
              <Label className="text-base text-white">Vibration</Label>
              <p className="text-xs text-muted-foreground">
                Use haptic feedback for timers and actions.
              </p>
            </div>
            <Switch
              checked={settings.vibrations}
              onCheckedChange={() => toggle("vibrations")}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Units</h2>

          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Weight</Label>
            <div className="flex rounded-2xl border border-border bg-black/40 overflow-hidden">
              {(["kg", "lbs"] as const).map((u) => (
                <Button
                  key={u}
                  variant={settings.units.weight === u ? "default" : "ghost"}
                  className={`flex-1 rounded-none py-4 text-base ${
                    settings.units.weight === u
                      ? "bg-primary text-white"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setUnit("weight", u)}
                >
                  {u}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Distance</Label>
            <div className="flex rounded-2xl border border-border bg-black/40 overflow-hidden">
              {(["kilometers", "miles"] as const).map((u) => (
                <Button
                  key={u}
                  variant={settings.units.distance === u ? "default" : "ghost"}
                  className={`flex-1 rounded-none py-4 text-base ${
                    settings.units.distance === u
                      ? "bg-primary text-white"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setUnit("distance", u)}
                >
                  {u}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">
              Body measurements
            </Label>
            <div className="flex rounded-2xl border border-border bg-black/40 overflow-hidden">
              {(["cm", "in"] as const).map((u) => (
                <Button
                  key={u}
                  variant={settings.units.body === u ? "default" : "ghost"}
                  className={`flex-1 rounded-none py-4 text-base ${
                    settings.units.body === u
                      ? "bg-primary text-white"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setUnit("body", u)}
                >
                  {u}
                </Button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
