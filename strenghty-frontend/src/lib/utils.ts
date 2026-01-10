import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { loadSettings, saveSettings } from "@/lib/settings";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUnit(): 'lbs' | 'kg' {
  // Primary source: user settings
  try {
    const settings = loadSettings();
    const w = settings.units.weight;
    if (w === 'kg' || w === 'lbs') return w;
  } catch {
    // ignore and fall back to legacy storage
  }

  // Legacy fallback: old `unit` key
  try {
    const u = localStorage.getItem('unit');
    if (u === 'kg' || u === 'lbs') return u;
  } catch {
    // ignore
  }

  // Default to kg for new users
  return 'kg';
}

export function setUnit(u: 'lbs' | 'kg') {
  try {
    const current = loadSettings();
    const next = {
      ...current,
      units: {
        ...current.units,
        weight: u,
      },
    };
    saveSettings(next);
  } catch {
    // ignore settings errors, still try legacy key below
  }

  try {
    localStorage.setItem('unit', u);
  } catch {}
}

export function hasInProgressWorkout(): boolean {
  try {
    return !!localStorage.getItem('workout:inProgress');
  } catch {
    return false;
  }
}

export function formatMinutes(totalMinutes?: number | null): string | undefined {
  if (totalMinutes === null || typeof totalMinutes === "undefined") return undefined;
  const mins = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours > 0) {
    return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
  }
  return `${rem}m`;
}
