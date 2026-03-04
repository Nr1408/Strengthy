import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MuscleTag from "@/components/workout/MuscleTag";
import { SetRow } from "@/components/workout/SetRow";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import { format } from "date-fns";
import { Trophy, PlusCircle } from "lucide-react";
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

const GRID_TEMPLATE_STRENGTH_NO_CHECK =
  "minmax(20px, 0.25fr) minmax(60px, 0.7fr) 6px minmax(22px, 0.65fr) minmax(28px, 0.35fr) 32px";
const GRID_TEMPLATE_CARDIO_NO_CHECK =
  "minmax(18px, 0.35fr) minmax(56px, 0.6fr) minmax(56px, 0.8fr) minmax(28px, 0.25fr) 32px";
const GRID_TEMPLATE_HIIT_NO_CHECK =
  "minmax(20px, 0.25fr) minmax(60px, 0.7fr) minmax(48px, 0.7fr) minmax(32px, 0.5fr) 32px";

const isHiitExerciseName = (value: string) => {
  const name = (value || "").toLowerCase();
  return (
    name.includes("hiit") ||
    name.includes("burpee") ||
    name.includes("mountain") ||
    name.includes("climb") ||
    name.includes("jump squat") ||
    name.includes("plank jack") ||
    name.includes("skater") ||
    name.includes("jumping jack") ||
    name.includes("high knee")
  );
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

  const resolvedExerciseId = useMemo(() => {
    if (!id) return "";

    const routeId = String(id);
    const byExactId = exercises.find((e) => String(e.id) === routeId);
    if (byExactId) return String(byExactId.id);

    if (exerciseNameFromState) {
      const byName = exercises.find(
        (e) =>
          String(e.name || "").toLowerCase() ===
          String(exerciseNameFromState || "").toLowerCase(),
      );
      if (byName) return String(byName.id);
    }

    return routeId;
  }, [id, exercises, exerciseNameFromState]);

  const { data: sets = [] } = useQuery({
    queryKey: ["exercise-sets", resolvedExerciseId],
    queryFn: () => getSetsForExercise(String(resolvedExerciseId || "")),
    enabled: !!resolvedExerciseId && /^\d+$/.test(String(resolvedExerciseId)),
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const selectedExercise = useMemo(() => {
    const byId = exercises.find(
      (e) => String(e.id) === String(resolvedExerciseId || id),
    );
    if (byId) return byId;
    return {
      id: String(id || ""),
      name: exerciseNameFromState || `Exercise ${id}`,
      muscleGroup: muscleFromState,
      createdAt: new Date(),
    };
  }, [
    exercises,
    id,
    resolvedExerciseId,
    exerciseNameFromState,
    muscleFromState,
  ]);

  const completedWorkoutIds = useMemo(
    () =>
      new Set(
        workouts.filter((w: any) => !!w?.endedAt).map((w: any) => String(w.id)),
      ),
    [workouts],
  );

  const loggedSets = useMemo(
    () =>
      (sets || []).filter((s: any) =>
        completedWorkoutIds.has(
          String(s.workout || s.workoutId || s.workout_id || ""),
        ),
      ),
    [sets, completedWorkoutIds],
  );

  const records = useMemo(() => {
    let heaviestWeight = 0;
    let heaviestUnit = "kg";
    let bestSet = "-";
    let estimated1RM = 0;

    (loggedSets || []).forEach((s: any) => {
      const weight = Number(s.weight || 0);
      const reps = Number(s.reps || 0);
      if (weight > heaviestWeight) {
        heaviestWeight = weight;
        heaviestUnit = String(s.unit || "kg");
      }
      if (
        reps > 0 &&
        (bestSet === "-" ||
          reps > Number(String(bestSet).split(" reps")[0] || 0))
      ) {
        bestSet = `${reps} reps @ ${weight || 0}`;
      }
      if (weight > 0 && reps > 0) {
        const est = weight * (1 + reps / 30);
        if (est > estimated1RM) estimated1RM = est;
      }
    });

    const totalWorkouts = new Set(
      (loggedSets || []).map((s: any) =>
        String(s.workout || s.workoutId || s.workout_id || ""),
      ),
    ).size;

    return {
      heaviestWeight,
      heaviestUnit,
      bestSet,
      estimated1RM,
      totalWorkouts,
    };
  }, [loggedSets]);

  const groupedHistory = useMemo(() => {
    const map = new Map<
      string,
      {
        workoutId: string;
        workoutName: string;
        date: Date | undefined;
        sets: any[];
      }
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

  const lastPerformed = useMemo(() => {
    return groupedHistory && groupedHistory.length > 0 && groupedHistory[0].date
      ? new Date(groupedHistory[0].date)
      : null;
  }, [groupedHistory]);

  const primaryMuscle = selectedExercise.muscleGroup || "other";
  const secondaryMuscles = SECONDARY_BY_PRIMARY[primaryMuscle] || [
    "Support Muscles",
  ];

  const progressionPoints = useMemo(() => {
    const points = groupedHistory
      .slice()
      .reverse()
      .map((group) => {
        let maxWeight = 0;
        (group.sets || []).forEach((s: any) => {
          const w = Number(s.weight || 0);
          if (w > maxWeight) maxWeight = w;
        });
        return {
          workoutId: group.workoutId,
          value: maxWeight,
          date: group.date,
        };
      })
      .filter((p) => p.value > 0);

    return points;
  }, [groupedHistory]);

  const progressPolyline = useMemo(() => {
    if (progressionPoints.length < 2) return "";

    const width = 100;
    const height = 40;
    const maxY = Math.max(...progressionPoints.map((p) => p.value), 1);

    return progressionPoints
      .map((p, idx) => {
        const x = (idx / (progressionPoints.length - 1)) * width;
        const y = height - (p.value / maxY) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [progressionPoints]);

  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-zinc-800 px-3 py-1 text-xs font-semibold text-white uppercase tracking-wide";

  return (
    <AppLayout>
      <div className="space-y-6 mt-1 px-1 sm:px-0 max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
        >
          ◀
        </button>

        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="px-[18px] py-5">
            <h2 className="text-2xl font-bold text-white">
              {selectedExercise.name}
            </h2>

            <div className="mt-4">
              <div className="h-[100px] w-[100px] rounded-md bg-zinc-800 border border-white/10 p-2 flex items-center justify-center">
                <img
                  src={`/icons/${getExerciseIconFile(selectedExercise.name, selectedExercise.muscleGroup || "")}`}
                  alt={selectedExercise.name}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-sm text-muted-foreground block">
                Primary
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={pill}>
                  {String(selectedExercise.muscleGroup || "other")}
                </span>
              </div>
            </div>

            <div className="mt-2.5 text-sm text-muted-foreground">
              <div>Secondary</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {secondaryMuscles.map((m) => (
                  <span key={m} className={pill}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">Your Records</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 px-[18px] py-5">
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Heaviest Weight</p>
              <p className="text-lg font-semibold text-white">
                {records.heaviestWeight || 0} {records.heaviestUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Best Set</p>
              <p className="text-lg font-semibold text-white">
                {records.bestSet}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Estimated 1RM</p>
              <p className="text-lg font-semibold text-white">
                {Math.round(records.estimated1RM || 0)} {records.heaviestUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Total Workouts</p>
              <p className="text-lg font-semibold text-white">
                {records.totalWorkouts}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Last Performed</p>
              <p className="text-lg font-semibold text-white">
                {lastPerformed ? format(lastPerformed, "MMM d") : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">Progress Graph</CardTitle>
          </CardHeader>
          <CardContent className="px-[18px] pt-[18px] pb-[18px]">
            {progressionPoints.length >= 2 ? (
              <div className="mt-2.5 rounded-xl border border-white/10 bg-zinc-900/60 p-4">
                <svg
                  viewBox="0 0 100 40"
                  preserveAspectRatio="none"
                  className="w-full h-28"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary"
                    points={progressPolyline}
                  />
                </svg>
              </div>
            ) : (
              <div className="mt-2.5 rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-sm text-muted-foreground text-center flex items-center justify-center min-h-[112px]">
                Not enough data yet to draw progression.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-white">History</CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-[6px]">
            {groupedHistory.length === 0 ? (
              <div className="flex items-center justify-center">
                <Card className="w-full max-w-2xl rounded-2xl overflow-hidden">
                  <CardContent className="px-[18px] py-5 overflow-hidden">
                    <div className="flex flex-col items-center text-center gap-4 py-6">
                      <div className="h-16 w-16 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        No history yet
                      </h2>
                      <p className="text-sm text-muted-foreground max-w-xl">
                        We couldn't find any logged sets for this exercise. Try
                        logging a workout that includes this exercise, or browse
                        the exercise library for alternatives.
                      </p>
                      <div className="flex gap-3 mt-2">
                        <Button
                          onClick={() => navigate("/workouts/new")}
                          className="bg-primary"
                        >
                          Log a workout
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate("/exercises")}
                        >
                          Browse exercises
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedHistory.map((g, idx) => (
                  <div
                    key={`h-${g.workoutId}`}
                    className={
                      idx === 0 ? "" : "mt-3 border-t border-white/5 pt-3"
                    }
                  >
                    <Card className="w-full rounded-2xl overflow-hidden">
                      <CardContent className="px-3 py-[6px] overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div>
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/workouts/${g.workoutId}/view`)
                                }
                                className="pt-1 text-lg font-semibold text-white text-left hover:underline"
                              >
                                {g.workoutName}
                              </button>
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground/80">
                              {g.date
                                ? format(new Date(g.date), "dd LLL yyyy, HH:mm")
                                : "-"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div
                            className="mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
                            style={{
                              gridTemplateColumns: ((): string => {
                                const isHiit = isHiitExerciseName(
                                  selectedExercise.name || "",
                                );
                                if (
                                  g.sets &&
                                  g.sets.length > 0 &&
                                  g.sets[0].cardioMode
                                ) {
                                  return isHiit
                                    ? GRID_TEMPLATE_HIIT_NO_CHECK
                                    : GRID_TEMPLATE_CARDIO_NO_CHECK;
                                }
                                return GRID_TEMPLATE_STRENGTH_NO_CHECK;
                              })(),
                            }}
                          >
                            {g.sets && g.sets[0] && g.sets[0].cardioMode ? (
                              (() => {
                                const isHiit = isHiitExerciseName(
                                  selectedExercise.name || "",
                                );

                                if (isHiit) {
                                  return (
                                    <>
                                      <span className="flex justify-center">
                                        SET
                                      </span>
                                      <span className="flex justify-center">
                                        DURATION
                                      </span>
                                      <span className="flex justify-center">
                                        REPS
                                      </span>
                                      <span className="flex justify-center">
                                        RPE
                                      </span>
                                      <span className="flex justify-center">
                                        PR
                                      </span>
                                    </>
                                  );
                                }

                                return (
                                  <>
                                    <span className="flex justify-center">
                                      SET
                                    </span>
                                    <span className="flex justify-center">
                                      DURATION
                                    </span>
                                    <span className="flex justify-center">
                                      DISTANCE
                                    </span>
                                    <span className="flex justify-center">
                                      LEVEL
                                    </span>
                                    <span className="flex justify-center">
                                      PR
                                    </span>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <span className="flex justify-center translate-x-[2px]">
                                  SET
                                </span>
                                <span className="flex justify-center">
                                  WEIGHT
                                </span>
                                <span />
                                <span className="flex justify-center">
                                  REPS
                                </span>
                                <span className="flex justify-center">RPE</span>
                                <span className="flex justify-center">
                                  <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
                                </span>
                              </>
                            )}
                          </div>

                          <div className="space-y-2">
                            {g.sets.map((s: any, idx: number) => (
                              <SetRow
                                key={`${g.workoutId}-${idx}`}
                                set={s}
                                exerciseName={selectedExercise.name || ""}
                                unit={s.unit || "kg"}
                                setNumber={s.setNumber ?? idx + 1}
                                onUpdate={() => {}}
                                onUnitChange={() => {}}
                                onComplete={() => {}}
                                readOnly
                                showComplete={false}
                              />
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
