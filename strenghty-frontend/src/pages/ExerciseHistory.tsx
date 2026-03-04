import React, { useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import MuscleTag from "@/components/workout/MuscleTag";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import { useQuery } from "@tanstack/react-query";
import { getSetsForExercise, getWorkouts } from "@/lib/api";
import { format } from "date-fns";
import { SetRow } from "@/components/workout/SetRow";
import { Trophy, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export default function ExerciseHistory() {
  return (
    <AppLayout>
      <ExerciseHistoryContent />
    </AppLayout>
  );
}

type ExerciseHistoryContentProps = {
  showBackButton?: boolean;
  showExerciseHeader?: boolean;
  className?: string;
};

export function ExerciseHistoryContent({
  showBackButton = true,
  showExerciseHeader = true,
  className,
}: ExerciseHistoryContentProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const exerciseName = location?.state?.exerciseName as string | undefined;
  const muscleGroup = location?.state?.muscleGroup as string | undefined;

  const isNumericId = id != null && /^[0-9]+$/.test(String(id));

  const { data: serverSets = [] } = useQuery({
    queryKey: ["exerciseSets", id],
    queryFn: async () => {
      if (!id) return [] as any[];
      try {
        const [strength, cardio] = await Promise.all([
          getSetsForExercise(String(id)),
          (async () => {
            try {
              const cs = await (
                await import("@/lib/api")
              ).getCardioSetsForExercise(String(id));
              return cs;
            } catch {
              return [] as any[];
            }
          })(),
        ] as any);

        const cardioMapped = (cardio || []).map((s: any) => {
          const mode = s.mode as any;
          const durationSeconds =
            typeof s.durationSeconds === "number" ? s.durationSeconds : 0;
          const rawDistance =
            typeof s.distance === "number" && !isNaN(s.distance)
              ? s.distance
              : 0;
          const distance = mode === "stairs" ? rawDistance : rawDistance / 1000;

          let cardioStat: number | undefined;
          if (mode === "stairs") {
            cardioStat =
              typeof s.floors === "number" && !isNaN(s.floors)
                ? s.floors
                : typeof s.level === "number" && !isNaN(s.level)
                  ? s.level
                  : undefined;
          } else if (mode === "row") {
            cardioStat =
              typeof s.splitSeconds === "number" && !isNaN(s.splitSeconds)
                ? s.splitSeconds
                : undefined;
          } else {
            cardioStat =
              typeof s.level === "number" && !isNaN(s.level)
                ? s.level
                : undefined;
          }

          return {
            id: String(s.id),
            workout: String(s.workout),
            exercise: String(s.exercise),
            setNumber: s.setNumber,
            reps: 0,
            weight: 0,
            unit: s.unit || "kg",
            isPR: !!s.isPR,
            completed: true,
            type: "S",
            cardioMode: mode,
            cardioDurationSeconds: durationSeconds,
            cardioDistance: distance,
            cardioStat,
            cardioDistancePR: !!s.distancePR,
            cardioPacePR: !!s.pacePR,
            cardioAscentPR: !!s.ascentPR,
            cardioIntensityPR: !!s.intensityPR,
            cardioSplitPR: !!s.splitPR,
            createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
          } as any;
        });

        return [...(strength || []), ...cardioMapped];
      } catch {
        return [] as any[];
      }
    },
    enabled: isNumericId,
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const completedWorkoutIds = useMemo(() => {
    return new Set(
      (workouts || [])
        .filter((w: any) => !!w?.endedAt)
        .map((w: any) => String(w.id)),
    );
  }, [workouts]);

  const localHistory = useMemo(() => {
    if (!exerciseName) return [] as any[];
    const out: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("workout:state:")) continue;
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const wName = parsed.workoutName || key.replace("workout:state:", "");
          const startTime = parsed.startTime || null;
          const exercises = parsed.exercises || [];
          exercises.forEach((ex: any) => {
            if (!ex || !ex.exercise) return;
            if (
              String(ex.exercise.name || "").toLowerCase() ===
              exerciseName.toLowerCase()
            ) {
              out.push({
                workoutId: key.replace("workout:state:", ""),
                workoutName: wName,
                date: startTime,
                sets: ex.sets || [],
              });
            }
          });
        } catch {}
      }
    } catch {}
    return out;
  }, [exerciseName]);

  const grouped = useMemo(() => {
    if (serverSets && serverSets.length > 0) {
      const m = new Map<string, any>();
      serverSets.forEach((s: any) => {
        const wid = String(s.workout || s.workout_id || s.workoutId || "unknown");
        if (!completedWorkoutIds.has(wid)) return;
        if (!m.has(wid)) m.set(wid, []);
        m.get(wid).push(s);
      });

      const arr = Array.from(m.entries()).map(([wid, sets]) => {
        const workout = workouts.find((w: any) => String(w.id) === wid);
        return {
          workoutId: wid,
          workoutName: workout ? workout.name : `Workout ${wid}`,
          date:
            workout && workout.createdAt
              ? workout.createdAt
              : workout && workout.date
                ? workout.date
                : undefined,
          sets,
        };
      });

      arr.sort((a: any, b: any) => {
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return bd - ad;
      });
      return arr;
    }

    const arr = localHistory
      .filter((h: any) => completedWorkoutIds.has(String(h.workoutId)))
      .map((h) => ({
        workoutId: h.workoutId,
        workoutName: h.workoutName,
        date: h.date,
        sets: h.sets,
      }));

    arr.sort((a: any, b: any) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });
    return arr;
  }, [serverSets, workouts, localHistory, completedWorkoutIds]);

  return (
    <div className={cn("space-y-3 -mt-4", className)}>
      {showBackButton && (
        <div className="mt-0.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
          >
            ◀
          </button>
        </div>
      )}

      {showExerciseHeader && (
        <div>
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 flex items-center justify-center rounded-md bg-zinc-800 border border-white/10">
              <img
                src={`/icons/${getExerciseIconFile(exerciseName || "", muscleGroup || "")}`}
                alt={exerciseName}
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold text-white leading-tight">
                {exerciseName || `Exercise ${id}`}
              </h1>
              {muscleGroup && <MuscleTag muscle={muscleGroup} />}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {grouped.length === 0 ? (
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-2xl rounded-2xl overflow-hidden">
              <CardContent className="px-2 py-4 sm:p-4 overflow-hidden">
                <div className="flex flex-col items-center text-center gap-4 py-6">
                  <div className="h-16 w-16 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center">
                    <PlusCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">No history yet</h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    We couldn't find any logged sets for this exercise. Try logging
                    a workout that includes this exercise, or browse the exercise
                    library for alternatives.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <Button onClick={() => navigate("/workouts/new")} className="bg-primary">
                      Log a workout
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/exercises")}>
                      Browse exercises
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          grouped.map((g) => (
            <Card key={`h-${g.workoutId}`} className="w-full rounded-2xl overflow-hidden">
              <CardContent className="px-2 py-4 sm:p-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/workouts/${g.workoutId}/view`)}
                        className="pt-2 text-lg font-semibold text-white text-left hover:underline"
                      >
                        {g.workoutName}
                      </button>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {g.date ? format(new Date(g.date), "dd LLL yyyy, HH:mm") : "-"}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div
                    className="mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
                    style={{
                      gridTemplateColumns: (() => {
                        const isHiit = isHiitExerciseName(exerciseName || "");
                        if (g.sets && g.sets.length > 0 && g.sets[0].cardioMode) {
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
                        const isHiit = isHiitExerciseName(exerciseName || "");
                        if (isHiit) {
                          return (
                            <>
                              <span className="flex justify-center">SET</span>
                              <span className="flex justify-center">DURATION</span>
                              <span className="flex justify-center">REPS</span>
                              <span className="flex justify-center">RPE</span>
                              <span className="flex justify-center">PR</span>
                            </>
                          );
                        }
                        return (
                          <>
                            <span className="flex justify-center">SET</span>
                            <span className="flex justify-center">DURATION</span>
                            <span className="flex justify-center">DISTANCE</span>
                            <span className="flex justify-center">LEVEL</span>
                            <span className="flex justify-center">PR</span>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <span className="flex justify-center translate-x-[2px]">SET</span>
                        <span className="flex justify-center">WEIGHT</span>
                        <span />
                        <span className="flex justify-center">REPS</span>
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
                        exerciseName={exerciseName || ""}
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
          ))
        )}
      </div>
    </div>
  );
}
