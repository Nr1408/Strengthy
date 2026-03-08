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

// ─── Routine metadata ────────────────────────────────────────────────────────
// Tags each routine with the signals we score against.
// When adding a new routine to mockData, add one row here — nothing else needed.
const ROUTINE_TAGS: Record<
  string,
  {
    goals: Array<"hypertrophy" | "calorie-burn" | "powerlifting" | "other">;
    equipment: Array<"full-gym" | "home-gym" | "bodyweight" | "other">;
    experience: Array<"beginner" | "intermediate" | "advanced">;
    split: "upper" | "lower" | "full" | "push" | "pull" | "cardio" | "arms";
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
  "r-upper-hypertrophy":       { goals: ["hypertrophy"],                  equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "upper",  beginner: false },
  "r-lower-hypertrophy":       { goals: ["hypertrophy"],                  equipment: ["full-gym"],                              experience: ["intermediate", "advanced"],             split: "lower",  beginner: false },
  "r-full-a":                  { goals: ["hypertrophy", "calorie-burn"],  equipment: ["full-gym", "home-gym"],                  experience: ["beginner"],                             split: "full",   beginner: true  },
  "r-full-b":                  { goals: ["hypertrophy", "calorie-burn"],  equipment: ["full-gym", "home-gym"],                  experience: ["beginner", "intermediate"],             split: "full",   beginner: true  },
  "r-glutes-hamstrings":       { goals: ["hypertrophy", "calorie-burn"],  equipment: ["full-gym"],                              experience: ["beginner", "intermediate"],             split: "lower",  beginner: true  },
  "r-arms-shoulders":          { goals: ["hypertrophy"],                  equipment: ["full-gym", "home-gym"],                  experience: ["beginner", "intermediate"],             split: "arms",   beginner: true  },
  "r-conditioning-bodyweight": { goals: ["calorie-burn", "other"],        equipment: ["bodyweight", "home-gym", "full-gym"],    experience: ["beginner", "intermediate", "advanced"], split: "cardio", beginner: true  },
};

// ─── Scoring ──────────────────────────────────────────────────────────────────
function scoreRoutine(routineId: string, user: UserOnboardingData): number {
  const tags = ROUTINE_TAGS[routineId];
  if (!tags) return 0;

  let score = 0;

  // Goal match (most important signal)
  if (tags.goals.includes(user.goal)) score += 40;

  // Equipment match
  if (tags.equipment.includes(user.equipment)) score += 30;
  // Bodyweight routines are always accessible regardless of equipment
  if (tags.equipment.includes("bodyweight") && user.equipment !== "bodyweight") score += 5;

  // Experience match
  if (tags.experience.includes(user.experience)) score += 20;
  // Beginners always benefit from beginner-tagged routines
  if (user.experience === "beginner" && tags.beginner) score += 10;

  // Calorie-burn users benefit from full-body, lower-body, and cardio
  if (
    user.goal === "calorie-burn" &&
    (tags.split === "full" || tags.split === "lower" || tags.split === "cardio")
  ) {
    score += 10;
  }

  // Bodyweight-only users: heavily penalise gym-only routines
  if (user.equipment === "bodyweight" && !tags.equipment.includes("bodyweight")) {
    score -= 50;
  }

  // Home-gym users: penalise full-gym-only routines
  if (
    user.equipment === "home-gym" &&
    tags.equipment.length === 1 &&
    tags.equipment[0] === "full-gym"
  ) {
    score -= 20;
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
export function recommendNextRoutine(currentRoutineId?: string) {
  try {
    if (!currentRoutineId) return null;
    const current = mockRoutines.find((r) => r.id === currentRoutineId);
    if (!current) return null;

    const currentTags = ROUTINE_TAGS[currentRoutineId];
    if (!currentTags) {
      const fallback = mockRoutines.find((r) => r.id !== currentRoutineId) ?? current;
      return { routine: fallback, label: `Next: ${fallback.name}` };
    }

    // Complementary split map — what to suggest after each split type
    const complementMap: Record<string, Array<string>> = {
      upper:  ["lower"],
      lower:  ["upper", "push", "pull"],
      push:   ["pull", "lower"],
      pull:   ["push", "lower"],
      full:   ["full"],
      cardio: ["upper", "lower", "full"],
      arms:   ["lower", "full"],
    };

    const preferredSplits = complementMap[currentTags.split] ?? ["full"];

    const scored = mockRoutines
      .filter((r) => r.id !== currentRoutineId && ROUTINE_TAGS[r.id])
      .map((r) => {
        const tags = ROUTINE_TAGS[r.id];
        const splitBonus = preferredSplits.includes(tags.split) ? 30 : 0;
        return { routine: r, score: splitBonus };
      })
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return null;

    const next = scored[0].routine;
    return { routine: next, label: `Next: ${next.name}` };
  } catch (e) {
    return null;
  }
}
