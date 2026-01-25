import { format } from "date-fns";
import { Clock, Trophy, ChevronRight } from "lucide-react";
import type { Workout } from "@/types/workout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getSets, getExercises, getCardioSetsForWorkout } from "@/lib/api";
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

  const cardioQuery = useQuery({
    queryKey: ["cardio-sets", workout.id],
    queryFn: () => getCardioSetsForWorkout(workout.id),
    enabled:
      !workout.exercises ||
      workout.exercises.length === 0 ||
      workout.exercises.every((ex) => (ex.sets || []).length === 0),
  });

  let totalSets = 0;
  let totalPRs = 0;
  let totalDistanceMeters = 0;
  let totalVolume = 0;
  let exerciseBadges: string[] = [];
  let hasStrength = false;
  let hasCardio = false;

  if (workout.exercises && workout.exercises.length > 0) {
    totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    totalPRs = workout.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.isPR).length,
      0,
    );
    exerciseBadges = workout.exercises
      .slice(0, 3)
      .map((ex) => ex.exercise.name);
    // detect whether sets are strength or cardio
    hasStrength = workout.exercises.some((ex) =>
      (ex.sets || []).some(
        (s: any) =>
          (s.weight !== undefined && Number(s.weight) > 0) ||
          (s.reps !== undefined && Number(s.reps) > 0) ||
          s.set_type === "S",
      ),
    );
    hasCardio = workout.exercises.some((ex) =>
      (ex.sets || []).some(
        (s: any) =>
          s.cardioMode ||
          s.cardioDistance !== undefined ||
          s.distance_meters !== undefined ||
          s.split_seconds !== undefined,
      ),
    );
  } else {
    // If workout.exercises is empty, combine strength + cardio sets fetched from server
    const strengthSets = (setsQuery.data || []) as UiWorkoutSet[];
    const cardioSets = (cardioQuery.data || []) as any[];
    totalSets = strengthSets.length + cardioSets.length;
    totalPRs =
      (strengthSets.filter((s) => s.isPR).length || 0) +
      (cardioSets.filter((s) => s.isPR).length || 0);

    totalVolume = strengthSets.reduce((acc, s) => {
      const w = typeof s.weight === "number" ? s.weight : Number(s.weight || 0);
      const r = typeof s.reps === "number" ? s.reps : Number(s.reps || 0);
      return acc + w * r;
    }, 0);

    // Sum cardio distances (distance_meters) for cardio sets
    totalDistanceMeters = cardioSets.reduce((acc, c) => {
      const d =
        typeof c.distance === "number"
          ? c.distance
          : Number(c.distance || c.distance_meters || 0);
      return acc + (Number.isFinite(d) ? d : 0);
    }, 0);

    hasStrength = strengthSets.length > 0;
    hasCardio = cardioSets.length > 0;

    const uniqueIds = Array.from(
      new Set([
        ...strengthSets.map((s) => s.exercise),
        ...cardioSets.map((c) => c.exercise),
      ]),
    ).slice(0, 3);
    exerciseBadges = uniqueIds.map((id) => {
      const found = (exercisesList as UiExercise[]).find(
        (e) => e.id === id || String(e.id) === String(id),
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
        if ((w && w > 0) || (r && r > 0)) {
          hasStrength = true;
        }
        return sa + w * r;
      }, 0);
      return acc + sVolume;
    }, 0);

    // Also compute cardio distance from workout.exercises if present
    totalDistanceMeters = workout.exercises.reduce((acc, ex) => {
      const sDist = (ex.sets || []).reduce((sd, ss: any) => {
        const d = typeof ss.cardioDistance === "number" ? ss.cardioDistance : 0;
        if (
          ss.cardioMode ||
          ss.cardioDistance !== undefined ||
          ss.distance_meters !== undefined
        ) {
          hasCardio = true;
        }
        // ss.cardioDistance is in km for non-stairs; convert to meters
        return sd + (ss.cardioMode === "stairs" ? 0 : d * 1000);
      }, 0);
      return acc + sDist;
    }, 0);
  }
  const onlyCardio = hasCardio && !hasStrength;
  let displayedExercisesCount: number | undefined;
  if (workout.exercises && workout.exercises.length > 0) {
    displayedExercisesCount = workout.exercises.length;
  } else {
    const strengthSets = (setsQuery.data || []) as UiWorkoutSet[];
    const cardioSets = (cardioQuery.data || []) as any[];
    const uniqueIds = Array.from(
      new Set([
        ...strengthSets.map((s) => s.exercise),
        ...cardioSets.map((c) => c.exercise),
      ]),
    );
    displayedExercisesCount = uniqueIds.length;
  }

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md rounded-2xl overflow-hidden"
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

        <div className="mt-4 flex flex-wrap sm:flex-nowrap items-center gap-4 text-xs text-muted-foreground">
          <span>{displayedExercisesCount ?? "?"} exercises</span>
          <span>{totalSets} sets</span>
          {!onlyCardio && workout.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatMinutes(workout.duration)}
            </span>
          )}
          {/* Volume (only show when not-only-cardio) */}
          {!onlyCardio && (
            <span>
              {totalVolume.toLocaleString()} {getUnit()}
            </span>
          )}
          {/* Cardio distance (show km) - always shown if present */}
          {totalDistanceMeters > 0 && (
            <span>{(totalDistanceMeters / 1000).toFixed(2)} km</span>
          )}
          {/* PRs: always show inline on the stats line */}
          {/* PR inline for sm+ screens */}
          {totalPRs > 0 && (
            <span className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
              <Trophy className="h-3.5 w-3.5" />
              {totalPRs} PR{totalPRs > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {/* PRs already shown inline above; no duplicate needed for small screens */}
      </CardContent>
    </Card>
  );
}
