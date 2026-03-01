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

// Count the number of distinct PR types represented by a set.
// Strength sets expose detailed flags like absWeightPR/e1rmPR/volumePR.
// Cardio sets expose distancePR/pacePR/ascentPR/intensityPR/splitPR.
// If a set is marked isPR but no specific flags are present (e.g. legacy or
// generic PRs), we treat that as a single PR so counts remain intuitive.
export function countPrTypesFromSet(set: any): number {
  if (!set) return 0;

  let count = 0;
  let hasTyped = false;

  const addFlag = (flag: unknown) => {
    if (flag) {
      hasTyped = true;
      count += 1;
    }
  };

  const type = (set as any).type;
  const hasCardioMode = (set as any).cardioMode || (set as any).mode;

  if (hasCardioMode) {
    // Cardio PR flags
    addFlag((set as any).distancePR || (set as any).is_distance_pr);
    addFlag((set as any).pacePR || (set as any).is_pace_pr);
    addFlag((set as any).ascentPR || (set as any).is_ascent_pr);
    addFlag((set as any).intensityPR || (set as any).is_intensity_pr);
    addFlag((set as any).splitPR || (set as any).is_split_pr);
  } else if (type === "W" || type === "S" || type === "F" || type === "D" || typeof type === "undefined") {
    // Strength PR flags (repPR intentionally excluded per UX — "Most Reps at this Weight"
    // is not surfaced as its own visible PR type).
    addFlag((set as any).absWeightPR || (set as any).is_abs_weight_pr);
    addFlag((set as any).e1rmPR || (set as any).is_e1rm_pr);
    addFlag((set as any).volumePR || (set as any).is_volume_pr);
  }

  // Fallback: generic PR with no typed flags
  if (!hasTyped && (set as any).isPR) {
    count += 1;
  }

  return count;
}
