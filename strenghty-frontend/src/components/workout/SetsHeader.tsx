import { Trophy } from "lucide-react";
import type { CardioMode } from "@/types/workout";

// Single source of truth for all grid layouts.
// Import these constants in SetRow.tsx and all workout pages
// instead of copy-pasting them.
export const GRID_TEMPLATE_STRENGTH =
  "minmax(20px, 0.23fr) minmax(50px, 0.65fr) minmax(20px, 0.65fr) minmax(25px, 0.25fr) 32px 30px";

export const GRID_TEMPLATE_STRENGTH_NO_CHECK =
  "minmax(20px, 0.25fr) minmax(60px, 0.7fr) minmax(22px, 0.65fr) minmax(28px, 0.35fr) 32px";

export const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.2fr) minmax(56px, 0.5fr) minmax(56px, 0.65fr) minmax(28px, 0.25fr) 32px 30px";

export const GRID_TEMPLATE_CARDIO_NO_CHECK =
  "minmax(18px, 0.35fr) minmax(56px, 0.6fr) minmax(56px, 0.8fr) minmax(28px, 0.25fr) 32px";

export const GRID_TEMPLATE_HIIT =
  "minmax(20px, 0.23fr) minmax(60px, 0.65fr) minmax(22px, 0.65fr) minmax(28px, 0.3fr) 32px 30px";

export const GRID_TEMPLATE_HIIT_NO_CHECK =
  "minmax(20px, 0.25fr) minmax(60px, 0.7fr) minmax(48px, 0.7fr) minmax(32px, 0.5fr) 32px";

export const GRID_TEMPLATE_TIMED =
  "minmax(20px, 0.23fr) minmax(50px, 0.65fr) minmax(20px, 0.65fr) minmax(25px, 0.25fr) 32px 30px";

export const GRID_TEMPLATE_TIMED_NO_CHECK =
  "minmax(20px, 0.23fr) minmax(50px, 0.65fr) 0.8fr minmax(25px, 0.25fr) 32px 30px";

// Shared HIIT name detection — use this everywhere instead of
// duplicating the inline check.
export const isHiitExerciseName = (name: string): boolean => {
  const n = (name || "").toLowerCase();
  return (
    n.includes("burpee") ||
    n.includes("mountain") ||
    n.includes("climb") ||
    n.includes("jump squat") ||
    n.includes("plank jack") ||
    n.includes("skater") ||
    n.includes("jumping jack") ||
    n.includes("high knee")
  );
};

// Shared cardio mode detection — use this everywhere instead of
// duplicating getCardioModeForExercise.
export const getCardioMode = (exerciseName: string): CardioMode => {
  const name = (exerciseName || "").toLowerCase();
  if (name.includes("treadmill")) return "treadmill";
  if (name.includes("bike") || name.includes("cycle")) return "bike";
  if (name.includes("elliptical")) return "elliptical";
  if (name.includes("stair") || name.includes("step")) return "stairs";
  if (name.includes("row")) return "row";
  return "treadmill";
};

interface SetsHeaderProps {
  muscleGroup: string;
  exerciseName: string;
  logType?: "strength" | "timed" | "timed+reps";
}

export function SetsHeader({
  muscleGroup,
  exerciseName,
  logType,
}: SetsHeaderProps) {
  const isCardio = muscleGroup === "cardio";
  const isHiit = isHiitExerciseName(exerciseName);
  const cardioMode = getCardioMode(exerciseName);

  if (isCardio) {
    const template = isHiit ? GRID_TEMPLATE_HIIT : GRID_TEMPLATE_CARDIO;

    return (
      <div
        className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
        style={{ gridTemplateColumns: template }}
      >
        <span className="flex items-center justify-center text-center translate-x-[2px]">
          SET
        </span>
        <span className="flex items-center justify-center text-center">
          DURATION
        </span>
        {isHiit ? (
          <span className="flex items-center justify-center text-center">
            REPS
          </span>
        ) : (
          <span className="flex items-center justify-center text-center">
            {cardioMode === "stairs" ? "CLIMB" : "DISTANCE"}
          </span>
        )}
        {isHiit ? (
          <span className="flex items-center justify-center text-center">
            RPE
          </span>
        ) : (
          <span className="flex items-center justify-center text-center">
            {cardioMode === "treadmill"
              ? "INCLINE"
              : cardioMode === "row"
                ? "SPLIT TIME"
                : "LEVEL"}
          </span>
        )}
        <span className="flex items-center justify-center text-center">
          <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
        </span>
        <div />
      </div>
    );
  }

  // Timed header variants
  if (logType === "timed+reps") {
    return (
      <div
        className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
        style={{ gridTemplateColumns: GRID_TEMPLATE_TIMED }}
      >
        <span className="flex items-center justify-center text-center translate-x-[2px]">
          SET
        </span>
        <span className="flex items-center justify-center text-center">
          DURATION
        </span>
        <span className="flex items-center justify-center text-center">
          REPS
        </span>
        <span className="flex items-center justify-center text-center">
          RPE
        </span>
        <span className="flex items-center justify-center text-center">
          <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
        </span>
        <div />
      </div>
    );
  }

  if (logType === "timed") {
    return (
      <div
        className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
        style={{ gridTemplateColumns: GRID_TEMPLATE_TIMED_NO_CHECK }}
      >
        <span className="flex items-center justify-center text-center translate-x-[2px]">
          SET
        </span>
        <span className="flex items-center justify-center text-center">
          DURATION
        </span>
        <div />
        <span className="flex items-center justify-center text-center">
          RPE
        </span>
        <span className="flex items-center justify-center text-center">
          <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
        </span>
        <div />
      </div>
    );
  }

  // Strength header
  return (
    <div
      className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
      style={{ gridTemplateColumns: GRID_TEMPLATE_STRENGTH }}
    >
      <span className="flex items-center justify-center text-center translate-x-[2px]">
        SET
      </span>
      <span className="flex items-center justify-center text-center">
        WEIGHT
      </span>
      <span className="flex items-center justify-center text-center">REPS</span>
      <span className="flex items-center justify-center text-center">RPE</span>
      <span className="flex items-center justify-center text-center">
        <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
      </span>
      <div />
    </div>
  );
}
