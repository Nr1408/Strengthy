import { mockRoutines } from "@/data/mockData";

export type UserOnboardingData = {
  goal: "hypertrophy" | "calorie-burn" | "powerlifting" | "other";
  age: number | null;
  height: number | null;
  heightUnit: "cm" | "ft";
  weight: number | null;
  weightUnit: "kg" | "lbs";
  goalWeight?: number | null;
  goalWeightUnit?: "kg" | "lbs";
  equipment: "full-gym" | "home-gym" | "bodyweight" | "other";
  experience: "beginner" | "intermediate" | "advanced";
  monthlyWorkouts: number;
};

// ─── Routine metadata ────────────────────────────────────────────────────────
// Tags each routine with the signals we score against.
// When adding a new routine to mockData, add one row here — nothing else needed.
const ROUTINE_TAGS: Record<
  string,
  {
    goals: Array<"hypertrophy" | "calorie-burn" | "powerlifting" | "other">;
    equipment: Array<"full-gym" | "home-gym" | "bodyweight" | "other">;
    experience: Array<"beginner" | "intermediate" | "advanced">;
    split: "upper" | "lower" | "full" | "push" | "pull" | "cardio" | "arms" | "core";
    beginner: boolean;
  }
> = {
  "r-push":                    { goals: ["hypertrophy", "powerlifting"],  equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "push",   beginner: false },
  "r-pull":                    { goals: ["hypertrophy"],                  equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "pull",   beginner: false },
  "r-legs":                    { goals: ["hypertrophy", "calorie-burn"],  equipment: ["full-gym"],                              experience: ["beginner", "intermediate"],             split: "lower",  beginner: true  },
  "r-upper-a":                 { goals: ["hypertrophy"],                  equipment: ["full-gym"],                              experience: ["beginner", "intermediate"],             split: "upper",  beginner: true  },
  "r-lower-a":                 { goals: ["hypertrophy"],                  equipment: ["full-gym"],                              experience: ["beginner", "intermediate"],             split: "lower",  beginner: true  },
  "r-upper-strength":          { goals: ["powerlifting"],                 equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "upper",  beginner: false },
  "r-lower-strength":          { goals: ["powerlifting"],                 equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "lower",  beginner: false },
  "r-pl-squat":                { goals: ["powerlifting"],                 equipment: ["full-gym"],                              experience: ["beginner", "intermediate", "advanced"], split: "lower",  beginner: true  },
  "r-pl-bench":                { goals: ["powerlifting"],                 equipment: ["full-gym"],                              experience: ["beginner", "intermediate", "advanced"], split: "upper",  beginner: true  },
  "r-pl-deadlift":             { goals: ["powerlifting"],                 equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "lower",  beginner: false },
  "r-upper-hypertrophy":       { goals: ["hypertrophy"],                  equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "upper",  beginner: false },
  "r-lower-hypertrophy":       { goals: ["hypertrophy"],                  equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "lower",  beginner: false },
  "r-full-a":                  { goals: ["hypertrophy", "calorie-burn"],  equipment: ["full-gym"],                  experience: ["beginner"],                             split: "full",   beginner: true  },
  "r-full-b":                  { goals: ["hypertrophy", "calorie-burn"],  equipment: ["full-gym"],                  experience: ["beginner", "intermediate"],             split: "full",   beginner: true  },
  "r-glutes-hamstrings":       { goals: ["hypertrophy", "calorie-burn"],  equipment: ["full-gym"],                              experience: ["beginner", "intermediate"],             split: "lower",  beginner: true  },
  "r-arms-shoulders":          { goals: ["hypertrophy"],                  equipment: ["full-gym"],                                 experience: ["beginner", "intermediate"],             split: "arms",   beginner: true  },
  "r-conditioning-bodyweight": { goals: ["calorie-burn", "other"],        equipment: ["bodyweight", "full-gym"],                 experience: ["beginner", "intermediate", "advanced"], split: "cardio", beginner: true  },

  // Home / bodyweight routines
  "r-home-push":         { goals: ["hypertrophy"],                  equipment: ["bodyweight"],           experience: ["beginner", "intermediate", "advanced"], split: "push",   beginner: true  },
  "r-home-pull":         { goals: ["hypertrophy", "powerlifting"],  equipment: ["bodyweight"],           experience: ["beginner", "intermediate", "advanced"], split: "pull",   beginner: true  },
  "r-home-legs":         { goals: ["hypertrophy", "calorie-burn", "powerlifting"],  equipment: ["bodyweight"],           experience: ["beginner", "intermediate", "advanced"], split: "lower",  beginner: true  },
  "r-home-full-a":       { goals: ["hypertrophy", "calorie-burn"],  equipment: ["bodyweight"],           experience: ["beginner"],                             split: "full",   beginner: true  },
  "r-home-full-b":       { goals: ["hypertrophy", "calorie-burn"],  equipment: ["bodyweight"],           experience: ["beginner", "intermediate"],             split: "full",   beginner: true  },
  "r-home-conditioning": { goals: ["calorie-burn", "other"],        equipment: ["bodyweight"],           experience: ["beginner", "intermediate", "advanced"], split: "cardio", beginner: true  },

  // Dumbbell-only routines
  "r-db-push":   { goals: ["hypertrophy"],                  equipment: ["home-gym"],  experience: ["beginner", "intermediate", "advanced"], split: "push",   beginner: true  },
  "r-db-pull":   { goals: ["hypertrophy"],                  equipment: ["home-gym"],  experience: ["beginner", "intermediate", "advanced"], split: "pull",   beginner: true  },
  "r-db-legs":   { goals: ["hypertrophy", "calorie-burn"],  equipment: ["home-gym"],  experience: ["beginner", "intermediate", "advanced"], split: "lower",  beginner: true  },
  "r-db-full-a": { goals: ["hypertrophy", "calorie-burn"],  equipment: ["home-gym"],  experience: ["beginner"],                             split: "full",   beginner: true  },
  "r-db-full-b": { goals: ["hypertrophy", "calorie-burn"],  equipment: ["home-gym"],  experience: ["beginner", "intermediate"],             split: "full",   beginner: true  },
  "r-db-upper":  { goals: ["hypertrophy", "powerlifting"],  equipment: ["home-gym"],  experience: ["intermediate", "advanced"],             split: "upper",  beginner: false },

  // Beginner / mixed
  "r-beginner-full":     { goals: ["hypertrophy", "calorie-burn", "other"], equipment: ["bodyweight"],  experience: ["beginner"],                             split: "full",   beginner: true  },
  "r-home-upper":        { goals: ["hypertrophy"],                          equipment: ["bodyweight"],  experience: ["beginner", "intermediate", "advanced"], split: "upper",  beginner: true  },
  "r-db-lower-strength": { goals: ["powerlifting", "hypertrophy"],          equipment: ["home-gym"],    experience: ["beginner", "intermediate", "advanced"],             split: "lower",  beginner: true  },
  "r-core-abs":          { goals: ["hypertrophy", "calorie-burn", "other"], equipment: ["bodyweight", "home-gym", "full-gym"], experience: ["beginner", "intermediate", "advanced"], split: "core", beginner: true },
};

// ─── Scoring ──────────────────────────────────────────────────────────────────
function scoreRoutine(routineId: string, user: UserOnboardingData): number {
  const tags = ROUTINE_TAGS[routineId];
  if (!tags) return 0;
  // Strict equipment filter: disqualify routines that require other equipment
  // unless the routine is bodyweight-accessible.
  const requiresUserEquipment = tags.equipment.includes(user.equipment);
  const isBodyweightAccessible = tags.equipment.includes("bodyweight");
  if (!requiresUserEquipment && !isBodyweightAccessible) {
    return -1000; // massive negative score to disqualify
  }

  let score = 0;

  // Scoring hierarchy
  // 1) Goal match (highest weight)
  if (tags.goals.includes(user.goal)) score += 50;

  // 2) Equipment preference
  if (requiresUserEquipment) {
    score += 30;
  } else if (isBodyweightAccessible) {
    // Bodyweight routines accessible to everyone but score lower than direct equipment matches
    // If user explicitly chose bodyweight, treat as full equipment match
    score += user.equipment === "bodyweight" ? 30 : 10;
  }

  // 3) Experience match
  if (tags.experience.includes(user.experience)) score += 20;

  // Beginner safety: boost beginner-tagged routines for beginner users
  if (user.experience === "beginner" && tags.beginner) score += 40;

  // Calorie-burn users benefit from full-body, lower-body, and cardio
  if (
    user.goal === "calorie-burn" &&
    (tags.split === "full" || tags.split === "lower" || tags.split === "cardio")
  ) {
    score += 10;
  }

  // Core-only routines should never be recommended as a primary workout
  if (tags.split === "core") {
    score -= 40;
  }

  return score;
}

// ─── Label generator ─────────────────────────────────────────────────────────
function buildLabel(routineId: string, routineName: string, user: UserOnboardingData): string {
  const tags = ROUTINE_TAGS[routineId];
  const splitLabel = tags?.split
    ? ({
        upper:  "Upper Body",
        lower:  "Lower Body",
        full:   "Full Body",
        push:   "Push Day",
        pull:   "Pull Day",
        cardio: "Conditioning",
        arms:   "Arms & Shoulders",
      } as Record<string, string>)[tags.split] ?? routineName
    : routineName;

  const goalLabel = ({
    "hypertrophy":  "Hypertrophy",
    "calorie-burn": "Calorie Burner",
    "powerlifting": "Strength",
    "other":        "Starter",
  } as Record<string, string>)[user.goal] ?? "Starter";

  return `${splitLabel} — ${goalLabel} Starter`;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function recommendFirstWorkout(user: UserOnboardingData) {
  const scored = mockRoutines
    .filter((r) => ROUTINE_TAGS[r.id] !== undefined)
    .map((r) => ({ routine: r, score: scoreRoutine(r.id, user) }))
    .sort((a, b) => b.score - a.score);

  // Pick highest scorer; fall back to first routine if nothing is tagged
  const best = scored[0]?.routine ?? mockRoutines[0];
  const label = buildLabel(best.id, best.name, user);

  return { routine: best, label };
}

// ─── Next workout suggestion ──────────────────────────────────────────────────
export function recommendNextRoutine(
  currentRoutineId?: string,
  recentRoutineIds: string[] = [],
) {
  try {
    if (!currentRoutineId) return null;
    const current = mockRoutines.find((r) => r.id === currentRoutineId);
    if (!current) return null;

    const currentTags = ROUTINE_TAGS[currentRoutineId];
    if (!currentTags) {
      const fallback = mockRoutines.find((r) => r.id !== currentRoutineId) ?? current;
      return { routine: fallback, label: `Next: ${fallback.name}` };
    }

    const complementMap: Record<string, Array<string>> = {
      upper:  ["lower"],
      lower:  ["push", "upper", "pull"],
      push:   ["pull", "lower"],
      pull:   ["lower", "push"],
      full:   ["full"],
      cardio: ["upper", "lower", "full"],
      arms:   ["lower", "full"],
    };

    const preferredSplits = complementMap[currentTags.split] ?? ["full"];

    // Full-body partner swap
    if (currentTags.split === "full") {
      const partnerId = currentRoutineId.replace(/-(?:b|a)$/i, (m) =>
        m.toLowerCase() === "-b" ? "-a" : "-b",
      );
      if (partnerId !== currentRoutineId && ROUTINE_TAGS[partnerId]) {
        const partner = mockRoutines.find((r) => r.id === partnerId);
        if (partner) return { routine: partner, label: `Next: ${partner.name}` };
      }
    }

    const currentEquipment = currentTags.equipment;
    const equipmentRestricted = !currentEquipment.includes("full-gym");

    // Build excluded set: current + immediately previous only (allow older routines back)
    const excluded = new Set([currentRoutineId, recentRoutineIds[0]].filter(Boolean) as string[]);

    const scored = mockRoutines
      .filter((r) => {
        if (excluded.has(r.id)) return false;
        const tags = ROUTINE_TAGS[r.id];
        if (!tags) return false;
        if (tags.split === "core") return false;
        if (equipmentRestricted) {
          return tags.equipment.some((e) => currentEquipment.includes(e));
        }
        return true;
      })
      .map((r) => {
        const tags = ROUTINE_TAGS[r.id];
        const preferredIndex = preferredSplits.indexOf(tags.split);
        const splitBonus = preferredIndex === 0 ? 40 : preferredIndex === 1 ? 20 : preferredIndex >= 0 ? 10 : 0;
        // Small deterministic jitter based on routine id to break ties differently each time
        const jitter = (r.id.charCodeAt(r.id.length - 1) % 10);
        return { routine: r, score: splitBonus + jitter };
      })
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return null;

    const next = scored[0].routine;
    return { routine: next, label: `Next: ${next.name}` };
  } catch (e) {
    return null;
  }
}
