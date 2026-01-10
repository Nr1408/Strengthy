import { format } from "date-fns";
import { Clock, Trophy, ChevronRight } from "lucide-react";
import type { Workout } from "@/types/workout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getSets, getExercises } from "@/lib/api";
import type { UiWorkoutSet, UiExercise } from "@/lib/api";
import { getUnit, formatMinutes } from "@/lib/utils";

interface WorkoutCardProps {
  workout: Workout;
  onClick?: () => void;
}

export function WorkoutCard({ workout, onClick }: WorkoutCardProps) {
  const { data: exercisesList = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  const setsQuery = useQuery({
    queryKey: ["sets", workout.id],
    queryFn: () => getSets(workout.id),
    enabled:
      !workout.exercises ||
      workout.exercises.length === 0 ||
      workout.exercises.every((ex) => (ex.sets || []).length === 0),
  });

  let totalSets = 0;
  let totalPRs = 0;
  let totalVolume = 0;
  let exerciseBadges: string[] = [];

  if (workout.exercises && workout.exercises.length > 0) {
    totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    totalPRs = workout.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.isPR).length,
      0
    );
    exerciseBadges = workout.exercises
      .slice(0, 3)
      .map((ex) => ex.exercise.name);
  } else if (setsQuery.data) {
    const sets = setsQuery.data as UiWorkoutSet[];
    totalSets = sets.length;
    totalPRs = sets.filter((s) => s.isPR).length;
    totalVolume = sets.reduce((acc, s) => {
      const w = typeof s.weight === "number" ? s.weight : Number(s.weight || 0);
      const r = typeof s.reps === "number" ? s.reps : Number(s.reps || 0);
      return acc + w * r;
    }, 0);
    const unique = Array.from(new Set(sets.map((s) => s.exercise))).slice(0, 3);
    exerciseBadges = unique.map((id) => {
      const found = (exercisesList as UiExercise[]).find(
        (e) => e.id === id || String(e.id) === String(id)
      );
      return found ? found.name : `Exercise ${id}`;
    });
  }
  // If workout.exercises provided, compute volume from them too
  if (workout.exercises && workout.exercises.length > 0) {
    totalVolume = workout.exercises.reduce((acc, ex) => {
      const sVolume = (ex.sets || []).reduce((sa, ss) => {
        const w =
          typeof ss.weight === "number" ? ss.weight : Number(ss.weight || 0);
        const r = typeof ss.reps === "number" ? ss.reps : Number(ss.reps || 0);
        return sa + w * r;
      }, 0);
      return acc + sVolume;
    }, 0);
  }
  const displayedExercisesCount =
    workout.exercises && workout.exercises.length > 0
      ? workout.exercises.length
      : setsQuery.data
      ? Array.from(
          new Set((setsQuery.data as UiWorkoutSet[]).map((s) => s.exercise))
        ).length
      : undefined;

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-heading font-semibold">{workout.name}</h3>
            <p className="text-sm text-muted-foreground">
              {format(workout.date, "EEEE, MMM d")}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {exerciseBadges.map((name, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))}
          {/* If workout.exercises known, show count of extra */}
          {workout.exercises && workout.exercises.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{workout.exercises.length - 3} more
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span>{displayedExercisesCount ?? "?"} exercises</span>
          <span>{totalSets} sets</span>
          {workout.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatMinutes(workout.duration)}
            </span>
          )}
          {/* Volume */}
          <span>
            {totalVolume.toLocaleString()} {getUnit()}
          </span>
          {totalPRs > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Trophy className="h-3.5 w-3.5" />
              {totalPRs} PR{totalPRs > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
