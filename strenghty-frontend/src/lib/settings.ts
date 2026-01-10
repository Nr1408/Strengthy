export type UnitsPreference = {
  weight: "kg" | "lbs";
  distance: "kilometers" | "miles";
  body: "cm" | "in";
};

export type UserSettings = {
  notifications: boolean;
  vibrations: boolean;
  units: UnitsPreference;
};

const STORAGE_KEY = "user:settings";

export const defaultSettings: UserSettings = {
  notifications: true,
  vibrations: true,
  units: {
    weight: "kg",
    distance: "kilometers",
    body: "cm",
  },
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      units: {
        ...defaultSettings.units,
        ...(parsed.units || {}),
      },
    } as UserSettings;
  } catch (e) {
    return defaultSettings;
  }
}

export function saveSettings(s: UserSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {}
}
