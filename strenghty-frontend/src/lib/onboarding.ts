import { mockRoutines } from "@/data/mockData";

export type UserOnboardingData = {
  goal: "hypertrophy" | "calorie-burn" | "powerlifting" | "other";
  age: number | null;
  height: number | null;
  heightUnit: "cm" | "ft";
  weight: number | null;
  weightUnit: "kg" | "lbs";
  equipment: "full-gym" | "home-gym" | "bodyweight" | "other";
  experience: "beginner" | "intermediate" | "advanced";
  monthlyWorkouts: number;
};

// Deterministic, rule-based recommendation using available mock routines.
// Keeps behavior simple and transparent (no AI/randomization).
export function recommendFirstWorkout(user: UserOnboardingData) {
  // Default fallback
  let routine = mockRoutines.find((r) => r.id === "r-upper-a") || mockRoutines[0];
  let label = routine.name;

  if (user.goal === "hypertrophy") {
    // Prefer explicit hypertrophy routines if present
    const found = mockRoutines.find((r) => /hypertrophy/i.test(r.description || "") || /upper/i.test(r.name));
    if (found) routine = found;
    label = `${routine.name} — Hypertrophy Starter`;
  } else if (user.goal === "calorie-burn") {
    const found = mockRoutines.find((r) => /leg/i.test(r.name) || /full/i.test(r.name));
    if (found) routine = found;
    label = `Calorie Burner — ${routine.name}`;
  } else if (user.goal === "powerlifting") {
    // Powerlifting -> focus on lower-rep compound work; choose a push or legs routine
    const found = mockRoutines.find((r) => /push|legs|strength/i.test(r.name) || /strength/i.test(r.description || ""));
    if (found) routine = found;
    label = `Strength Foundation — ${routine.name}`;
  } else {
    // conservative default
    label = `${routine.name} — Starter`;
  }

  return { routine, label };
}

// Deterministic suggestion for next workout after completing a routine.
// Rules:
// - If current routine is upper-focused -> suggest a lower-focused routine
// - If current routine is lower-focused -> suggest an upper-focused routine
// - If bodyweight or no clear match -> suggest repeating same routine after rest
// This is intentionally simple and rule-based (no AI/random).
export function recommendNextRoutine(currentRoutineId?: string) {
  try {
    if (!currentRoutineId) return null;
    const current = mockRoutines.find((r) => r.id === currentRoutineId);
    if (!current) return null;

    const name = (current.name || "").toLowerCase();
    const desc = (current.description || "").toLowerCase();

    // prefer complementary split
    if (/upper|push/i.test(name) || /upper/i.test(desc)) {
      const found = mockRoutines.find((r) => /leg|lower/i.test(r.name) || /lower/i.test(r.description || ""));
      if (found) return { routine: found, label: `Next: ${found.name}` };
    }

    if (/leg|lower/i.test(name) || /lower/i.test(desc)) {
      const found = mockRoutines.find((r) => /upper|push|pull/i.test(r.name) || /upper/i.test(r.description || ""));
      if (found) return { routine: found, label: `Next: ${found.name}` };
    }

    // bodyweight / cardio focused -> suggest repeat
    if (/bodyweight|calisthenics|cardio/i.test(name) || /bodyweight|cardio/i.test(desc)) {
      return { routine: current, label: `Repeat: ${current.name}` };
    }

    // fallback: pick a different routine that is not the same id
    const fallback = mockRoutines.find((r) => r.id !== current.id) || current;
    return { routine: fallback, label: `Next: ${fallback.name}` };
  } catch (e) {
    return null;
  }
}
