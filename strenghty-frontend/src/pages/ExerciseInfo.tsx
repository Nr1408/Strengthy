import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MuscleTag from "@/components/workout/MuscleTag";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import {
  getExercises,
  getSetsForExercise,
  getWorkouts,
  type MuscleGroup,
} from "@/lib/api";

const SECONDARY_BY_PRIMARY: Record<MuscleGroup, string[]> = {
  chest: ["Shoulders", "Triceps"],
  back: ["Biceps", "Rear Delts"],
  shoulders: ["Triceps", "Upper Chest"],
  biceps: ["Forearms", "Brachialis"],
  triceps: ["Shoulders", "Chest"],
  quads: ["Glutes", "Hamstrings"],
  hamstrings: ["Glutes", "Lower Back"],
  calves: ["Tibialis", "Soleus"],
  forearms: ["Biceps", "Grip"],
  core: ["Obliques", "Lower Back"],
  cardio: ["Core", "Lower Body"],
  other: ["Support Muscles"],
};

export default function ExerciseInfo() {
  const { id } = useParams();
  const location = useLocation() as any;
  const navigate = useNavigate();

  const exerciseNameFromState =
    (location?.state?.exerciseName as string | undefined) || "";
  const muscleFromState =
    (location?.state?.muscleGroup as MuscleGroup | undefined) || "other";

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  const { data: sets = [] } = useQuery({
    queryKey: ["exercise-sets", id],
    queryFn: () => getSetsForExercise(String(id || "")),
    enabled: !!id,
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const selectedExercise = useMemo(() => {
    const byId = exercises.find((e) => String(e.id) === String(id));
    if (byId) return byId;
    return {
      id: String(id || ""),
      name: exerciseNameFromState || `Exercise ${id}`,
      muscleGroup: muscleFromState,
      createdAt: new Date(),
    };
  }, [exercises, id, exerciseNameFromState, muscleFromState]);

  const completedWorkoutIds = useMemo(
    () => new Set(workouts.filter((w: any) => !!w?.endedAt).map((w: any) => String(w.id))),
    [workouts],
  );

  const loggedSets = useMemo(
    () =>
      (sets || []).filter((s: any) =>
        completedWorkoutIds.has(String(s.workout || s.workoutId || s.workout_id || "")),
      ),
    [sets, completedWorkoutIds],
  );

  const records = useMemo(() => {
    let heaviestWeight = 0;
    let bestSet = "-";

    (loggedSets || []).forEach((s: any) => {
      const weight = Number(s.weight || 0);
      const reps = Number(s.reps || 0);
      if (weight > heaviestWeight) heaviestWeight = weight;
      if (reps > 0 && (bestSet === "-" || reps > Number(String(bestSet).split(" reps")[0] || 0))) {
        bestSet = `${reps} reps @ ${weight || 0}`;
      }
    });

    const totalWorkouts = new Set(
      (loggedSets || []).map((s: any) => String(s.workout || s.workoutId || s.workout_id || "")),
    ).size;

    return {
      heaviestWeight,
      bestSet,
      totalWorkouts,
    };
  }, [loggedSets]);

  const historyGroups = useMemo(() => {
    const map = new Map<
      string,
      { workoutId: string; workoutName: string; date: Date | undefined; sets: any[] }
    >();

    (loggedSets || []).forEach((set: any) => {
      const workoutId = String(
        set.workout || set.workoutId || set.workout_id || "",
      );
      if (!workoutId) return;

      const workout = workouts.find((w: any) => String(w.id) === workoutId);
      const date = workout?.date
        ? new Date(workout.date)
        : workout?.createdAt
          ? new Date(workout.createdAt)
          : undefined;

      if (!map.has(workoutId)) {
        map.set(workoutId, {
          workoutId,
          workoutName: workout?.name || `Workout ${workoutId}`,
          date,
          sets: [],
        });
      }

      map.get(workoutId)?.sets.push(set);
    });

    return Array.from(map.values()).sort((a, b) => {
      const at = a.date ? new Date(a.date).getTime() : 0;
      const bt = b.date ? new Date(b.date).getTime() : 0;
      return bt - at;
    });
  }, [loggedSets, workouts]);

  const primaryMuscle = selectedExercise.muscleGroup || "other";
  const secondaryMuscles = SECONDARY_BY_PRIMARY[primaryMuscle] || ["Support Muscles"];

  return (
    <AppLayout>
      <div className="space-y-5 mt-1 px-1 sm:px-0 max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
        >
          ◀
        </button>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white">Exercise Name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-1 sm:pt-2">
            <h2 className="text-2xl font-bold text-white">{selectedExercise.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Primary:</span>
              <MuscleTag muscle={selectedExercise.muscleGroup} />
            </div>
            <div className="text-sm text-muted-foreground">
              Secondary: <span className="text-white">{secondaryMuscles.join(", ")}</span>
            </div>

            <div className="pt-2">
              <div className="h-28 w-28 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center">
                <img
                  src={`/icons/${getExerciseIconFile(selectedExercise.name, selectedExercise.muscleGroup || "")}`}
                  alt={selectedExercise.name}
                  className="h-20 w-20 object-contain"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white">Your Records</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 sm:pt-2">
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
              <p className="text-xs text-muted-foreground">Heaviest Weight</p>
              <p className="text-lg font-semibold text-white">{records.heaviestWeight || 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
              <p className="text-xs text-muted-foreground">Best Set</p>
              <p className="text-lg font-semibold text-white">{records.bestSet}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
              <p className="text-xs text-muted-foreground">Total Workouts</p>
              <p className="text-lg font-semibold text-white">{records.totalWorkouts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white">Exercise history section</CardTitle>
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            {historyGroups.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-6 text-center space-y-3">
                <h3 className="text-2xl font-semibold text-white">No history yet</h3>
                <p className="text-sm text-muted-foreground">
                  We couldn't find any logged sets for this exercise.
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <Button onClick={() => navigate("/workouts/new")}>Log a workout</Button>
                  <Button variant="outline" onClick={() => navigate("/exercises")}>Browse exercises</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {historyGroups.map((group) => (
                  <div
                    key={group.workoutId}
                    className="rounded-xl border border-white/10 bg-zinc-900/60 p-4"
                  >
                    <button
                      type="button"
                      className="text-left text-lg font-semibold text-white hover:underline"
                      onClick={() => navigate(`/workouts/${group.workoutId}/view`)}
                    >
                      {group.workoutName}
                    </button>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {group.date ? new Date(group.date).toLocaleString() : "-"}
                    </div>

                    <div className="mt-3 space-y-2">
                      {group.sets.map((set: any) => (
                        <div
                          key={String(set.id)}
                          className="grid grid-cols-4 gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                        >
                          <div className="text-muted-foreground">Set {set.setNumber ?? "-"}</div>
                          <div className="text-white">
                            {typeof set.weight === "number" ? set.weight : 0}
                            {set.unit ? ` ${set.unit}` : ""}
                          </div>
                          <div className="text-white">{set.reps ?? 0} reps</div>
                          <div className="text-right text-muted-foreground">{set.rpe ? `RPE ${set.rpe}` : "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
