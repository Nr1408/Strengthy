export function getExerciseIconFile(name: string, muscleGroup?: string, isCustom?: boolean) {
  const n = (name || "").toLowerCase().trim();
  if (isCustom) return "custom.svg";

  // Exact name -> file mapping (lowercase keys)
  const exactMap: Record<string, string> = {
    // Quads
    "barbell high bar back squat": "quads.svg",
    "barbell low bar back squat": "quads.svg",
    "barbell front squat": "quads.svg",
    "barbell zercher squat": "quads.svg",
    "barbell hack squat": "quads.svg",
    "dumbbell goblet squat": "quads.svg",
    "dumbbell bulgarian split squat": "quads.svg",
    "dumbbell walking lunge": "quads.svg",
    "dumbbell step-up": "quads.svg",
    "leg press machine": "quads.svg",
    "hack squat machine": "quads.svg",
    "pendulum squat machine": "quads.svg",
    "v-squat machine": "quads.svg",
    "leg extension machine": "quads.svg",
    "sissy squat machine": "quads.svg",
    "smith machine squat": "quads.svg",

    // Hamstrings
    "barbell romanian deadlift": "hamstrings.svg",
    "barbell stiff-leg deadlift": "hamstrings.svg",
    "barbell good morning": "hamstrings.svg",
    "dumbbell romanian deadlift": "hamstrings.svg",
    "dumbbell single-leg rdl": "hamstrings.svg",
    "lying leg curl machine": "hamstrings.svg",
    "seated leg curl machine": "hamstrings.svg",
    "standing single-leg curl machine": "hamstrings.svg",
    "cable pull-through": "hamstrings.svg",
    "glute ham raise": "hamstrings.svg",
    "nordic hamstring curl": "hamstrings.svg",

    // Calves
    "seated calf raise machine": "calves.svg",
    "standing calf raise machine": "calves.svg",
    "donkey calf raise machine": "calves.svg",
    "leg press calf press": "calves.svg",
    "dumbbell single-leg calf raise": "calves.svg",
    "dumbbell farmer’s walk on toes": "calves.svg",

    // Chest
    "barbell incline bench press": "chest.svg",
    "dumbbell incline bench press": "chest.svg",
    "incline machine chest press": "chest.svg",
    "low-to-high cable fly": "chest.svg",
    "smith machine incline press": "chest.svg",
    "barbell flat bench press": "chest.svg",
    "barbell decline bench press": "chest.svg",
    "dumbbell flat bench press": "chest.svg",
    "dumbbell decline bench press": "chest.svg",
    "dumbbell flat chest fly": "chest.svg",
    "machine chest press": "chest.svg",
    "pec deck machine": "chest.svg",
    "high-to-low cable crossover": "chest.svg",
    "cable chest press": "chest.svg",
    "chest dips": "chest.svg",

    // Lats
    "wide grip lat pulldown": "lats.svg",
    "close grip lat pulldown": "lats.svg",
    "underhand lat pulldown": "lats.svg",
    "single-arm cable lat pulldown": "lats.svg",
    "straight-arm cable pulldown": "lats.svg",
    "dumbbell pullover": "lats.svg",
    "pull-ups": "lats.svg",
    "assisted pull-up machine": "lats.svg",

    // Upper Back
    "barbell bent-over row": "upper back.svg",
    "barbell pendlay row": "upper back.svg",
    "barbell t-bar row": "upper back.svg",
    "seated cable row": "upper back.svg",
    "single-arm dumbbell row": "upper back.svg",
    "dumbbell chest-supported row": "upper back.svg",
    "meadows row": "upper back.svg",
    "machine t-bar row": "upper back.svg",
    "hammer strength row machine": "upper back.svg",
    "landmine row": "upper back.svg",

    // Traps
    "dumbbell farmer's walk": "traps.svg",
    "dead hang": "traps.svg",
    "barbell shrugs": "traps.svg",
    "dumbbell shrugs": "traps.svg",
    "trap bar shrugs": "traps.svg",
    "upright cable shrugs": "traps.svg",

    // Front Delts
    "barbell overhead press": "front delts.svg",
    "dumbbell shoulder press": "front delts.svg",
    "shoulder press machine": "front delts.svg",
    "arnold press": "front delts.svg",
    "dumbbell front raise": "front delts.svg",
    "barbell front raise": "front delts.svg",
    "cable front raise": "front delts.svg",
    "landmine press": "front delts.svg",

    // Side Delts
    "dumbbell lateral raise": "side delts.svg",
    "cable lateral raise": "side delts.svg",
    "machine lateral raise": "side delts.svg",
    "barbell upright row": "side delts.svg",
    "dumbbell upright row": "side delts.svg",

    // Rear Delts
    "dumbbell rear delt fly": "rear delts.svg",
    "cable rear delt fly": "rear delts.svg",
    "reverse pec deck machine": "rear delts.svg",
    "cable face pull": "rear delts.svg",

    // Biceps
    "barbell bicep curl": "biceps.svg",
    "ez-bar bicep curl": "biceps.svg",
    "ez-bar preacher curl": "biceps.svg",
    "barbell reverse curl": "biceps.svg",
    "barbell spider curl": "biceps.svg",
    "dumbbell alternating bicep curl": "biceps.svg",
    "dumbbell incline curl": "biceps.svg",
    "dumbbell hammer curl": "biceps.svg",
    "dumbbell concentration curl": "biceps.svg",
    "dumbbell zottman curl": "biceps.svg",
    "cable rope hammer curl": "biceps.svg",
    "straight bar cable curl": "biceps.svg",
    "behind-the-back cable curl": "biceps.svg",
    "cable preacher curl": "biceps.svg",
    "high cable hercules curl": "biceps.svg",
    "machine bicep curl": "biceps.svg",
    "preacher curl machine": "biceps.svg",
    "chin-ups": "biceps.svg",
    "inverted row (underhand grip)": "biceps.svg",

    // Triceps
    "barbell close-grip bench press": "tricep.svg",
    "ez-bar skull crusher": "tricep.svg",
    "barbell floor press": "tricep.svg",
    "ez-bar jm press": "tricep.svg",
    "dumbbell overhead extension": "tricep.svg",
    "dumbbell flat skull crusher": "tricep.svg",
    "dumbbell kickback": "tricep.svg",
    "dumbbell tate press": "tricep.svg",
    "cable rope pushdown": "tricep.svg",
    "cable straight bar pushdown": "tricep.svg",
    "cable overhead rope extension": "tricep.svg",
    "cable cross-body extension": "tricep.svg",
    "cable single-arm underhand pushdown": "tricep.svg",
    "tricep dip machine": "tricep.svg",
    "seated tricep extension machine": "tricep.svg",
    "smith machine close-grip bench": "tricep.svg",
    "bodyweight dips": "tricep.svg",
    "bench dips": "tricep.svg",
    "diamond push-ups": "tricep.svg",

    // Forearms
    "barbell wrist curl": "forearms.svg",
    "barbell reverse wrist curl": "forearms.svg",
    "dumbbell wrist curl": "forearms.svg",
    "dumbbell reverse wrist curl": "forearms.svg",
    
    "barbell reverse bicep curl": "forearms.svg",
    "ez-bar reverse bicep curl": "forearms.svg",
    "cable reverse bicep curl": "forearms.svg",
    "dumbbell farmer's walk": "forearms.svg",
    "behind-the-back barbell wrist curl": "forearms.svg",
    "wrist roller": "forearms.svg",
    "plate pinches": "forearms.svg",
    "dead hang": "forearms.svg",

    // Abs
    "cable rope crunch": "abs.svg",
    "ab crunch machine": "abs.svg",
    "hanging leg raise": "abs.svg",
    "captain's chair knee raise": "abs.svg",
    "barbell ab rollout": "abs.svg",
    "weighted sit-up": "abs.svg",

    // Obliques
    "cable woodchop": "obliques.svg",
    "dumbbell russian twist": "obliques.svg",
    // Kettlebell exact mappings
    "kettlebell clean and press": "front delts.svg",
    "kettlebell snatch": "shoulders.svg",
    "kettlebell gorilla row": "lats.svg",
    "kettlebell halo": "shoulders.svg",
    "kettlebell turkish get-up": "abs.svg",
  };

  if (exactMap[n]) return exactMap[n];
  // Cardio-specific icons: only apply for cardio exercises
  if (muscleGroup && muscleGroup.toLowerCase() === "cardio") {
    // Prefer equipment-specific icons when the exercise name references them.
    if (n.includes("treadmill")) return "treadmill.svg";
    if (n.includes("ellipt")) return "elliptical.svg";
    if (n.includes("row") || n.includes("rower") || n.includes("rowing"))
      return "rowing.svg";
    if (n.includes("stair") || n.includes("step") || n.includes("climb"))
      return "stair climber.svg";
    if (n.includes("bike") || n.includes("cycle") || n.includes("stationary"))
      return "stationary bike.svg";

    // Default cardio icon when muscleGroup is 'cardio' but no keyword matched
    return "treadmill.svg";
  }

  // Try muscle group fallback for non-cardio exercises
  if (muscleGroup) {
    const mg = muscleGroup.toLowerCase();
    const mgToFile: { [k: string]: string } = {
      quads: "quads.svg",
      hamstrings: "hamstrings.svg",
      glutes: "glutes.svg",
      calves: "calves.svg",
      chest: "chest.svg",
      lats: "lats.svg",
      "upper back": "upper back.svg",
      traps: "traps.svg",
      "front delts": "front delts.svg",
      "side delts": "side delts.svg",
      "rear delts": "rear delts.svg",
      biceps: "biceps.svg",
      triceps: "tricep.svg",
      forearms: "forearms.svg",
      abs: "abs.svg",
      obliques: "obliques.svg",
    };
    if (mgToFile[mg]) return mgToFile[mg];
  }

  // Default fallback to dumbbell icon
  return "dumbbell.svg";
}
