import { Dumbbell, Trash2 } from "lucide-react";
import type { Exercise } from "@/types/workout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { muscleGroupColors } from "@/data/mockData";

interface ExerciseCardProps {
  exercise: Exercise;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

export function ExerciseCard({
  exercise,
  onClick,
  onDelete,
}: ExerciseCardProps) {
  return (
    <Card
      className="relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <Dumbbell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-semibold">{exercise.name}</h3>
            <Badge
              variant="secondary"
              className={
                muscleGroupColors[
                  // normalize legacy "other" group to calves for display
                  exercise.muscleGroup === "other"
                    ? "calves"
                    : exercise.muscleGroup
                ]
              }
            >
              {exercise.muscleGroup === "other"
                ? "calves"
                : exercise.muscleGroup}
            </Badge>
            {exercise.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {exercise.description}
              </p>
            )}
            {exercise.muscleGroup === "cardio" && (
              <div className="mt-2 flex gap-3 text-sm text-muted-foreground">
                <div className="flex flex-col">
                  <span className="text-[11px] text-white font-medium">
                    Distance
                  </span>
                  <span className="text-xs">-</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-white font-medium">
                    Duration
                  </span>
                  <span className="text-xs">-</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-white font-medium">
                    Pace
                  </span>
                  <span className="text-xs">-</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {onDelete && (
          <button
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(exercise.id);
            }}
            aria-label="Delete exercise"
            title="Delete exercise"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}
