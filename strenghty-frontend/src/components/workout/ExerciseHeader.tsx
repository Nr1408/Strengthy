import React from "react";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import MuscleTag from "@/components/workout/MuscleTag";

export default function ExerciseHeader({
  exerciseName,
  muscleGroup,
  onClick,
  trailing,
}: {
  exerciseName: string;
  muscleGroup?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-12 w-12 flex items-center justify-center rounded-md bg-zinc-800 border border-white/10 shrink-0">
        {exerciseName ? (
          <img
            src={`/icons/${getExerciseIconFile(exerciseName, muscleGroup || "")}`}
            alt={exerciseName}
            className="h-10 w-10 object-contain"
          />
        ) : (
          <div className="h-11 w-11" />
        )}
      </div>

      <div className="min-w-0 flex flex-col">
        <div className="flex items-center justify-between min-w-0">
          <div
            onClick={onClick}
            role={onClick ? "button" : undefined}
            className={onClick ? "cursor-pointer min-w-0" : "min-w-0"}
          >
            <div className="font-heading text-lg font-semibold text-white leading-tight">
              {exerciseName}
            </div>
          </div>
          {trailing ? (
            <div className="ml-2 flex-shrink-0">{trailing}</div>
          ) : null}
        </div>

        {muscleGroup && (
          <div className="mt-0">
            <MuscleTag muscle={muscleGroup} />
          </div>
        )}
      </div>
    </div>
  );
}
