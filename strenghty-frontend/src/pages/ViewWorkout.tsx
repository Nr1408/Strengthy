import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, MoreHorizontal, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Routine } from "@/types/workout";
import { AppLayout } from "@/components/layout/AppLayout";
import { SetRow } from "@/components/workout/SetRow";
import { SetsHeader } from "@/components/workout/SetsHeader";
import { Card, CardContent } from "@/components/ui/card";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import MuscleTag from "@/components/workout/MuscleTag";
import ExerciseHeader from "@/components/workout/ExerciseHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkouts,
  getSets,
  getExercises,
  deleteWorkout,
  getCardioSetsForWorkout,
} from "@/lib/api";
import { getUnit, formatMinutes, countPrTypesFromSet } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-3 w-full items-center justify-center text-center text-[10px] sm:text-xs leading-none">
      {children}
    </div>
  );
}

export default function ViewWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (workoutId: string) => deleteWorkout(workoutId),
    onSuccess: () => {
      // Invalidate all related queries so dashboard stats update correctly
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["sets"] });
      queryClient.invalidateQueries({ queryKey: ["setsByWorkout"] });
      queryClient.invalidateQueries({ queryKey: ["setsByWorkoutThis"] });
      queryClient.invalidateQueries({ queryKey: ["setsByWorkoutPrev"] });
      toast({ title: "Workout deleted" });
      navigate("/workouts");
    },
    onError: (err: any) => {
      // If unauthorized, show a clear message but don't redirect immediately.
      if (err && (err as any).status === 401) {
        toast({
          title: "Not authorized",
          description:
            "Your session may have expired. Please sign in again to continue.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Delete failed",
        description: String(err),
        variant: "destructive",
      });
    },
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const { data: sets = [] } = useQuery({
    queryKey: ["sets", id],
    queryFn: () => (id ? getSets(id) : Promise.resolve([])),
    enabled: !!id,
  });

  const { data: cardioSets = [] } = useQuery({
    queryKey: ["cardioSets", id],
    queryFn: () => (id ? getCardioSetsForWorkout(id) : Promise.resolve([])),
    enabled: !!id,
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  const workout = workouts.find((w) => w.id === id);

  const exerciseNotes = useMemo(() => {
    try {
      const storageKey = `workout:exerciseNotes:${workout?.id || id}`;
      const raw = storageKey ? localStorage.getItem(storageKey) : null;
      if (!raw) return {} as Record<string, string>;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, string>;
      }
    } catch (e) {}
    return {} as Record<string, string>;
  }, [workout?.id, id]);

  const grouped = useMemo(() => {
    type GroupBucket = { exercise: any; rawSets: any[] };
    const m = new Map<string, GroupBucket>();

    const ensureGroup = (exerciseId: string): GroupBucket => {
      let bucket = m.get(exerciseId);
      if (!bucket) {
        const ex = exercises.find(
          (e: any) => String(e.id) === String(exerciseId),
        ) || {
          id: exerciseId,
          name: `Exercise ${exerciseId}`,
          muscleGroup: "calves",
          createdAt: new Date(),
        };
        bucket = { exercise: ex, rawSets: [] };
        m.set(exerciseId, bucket);
      }
      return bucket;
    };

    // Strength sets
    sets.forEach((s: any) => {
      const exId = String(s.exercise);
      const bucket = ensureGroup(exId);
      bucket.rawSets.push({ ...s, __kind: "strength" });
    });

    // Cardio sets
    cardioSets.forEach((c: any) => {
      const exId = String(c.exercise);
      const bucket = ensureGroup(exId);
      bucket.rawSets.push({ ...c, __kind: "cardio" });
    });

    return Array.from(m.entries()).map(([exerciseId, bucket]) => {
      const ex = bucket.exercise;
      // Normalize HIIT/bodyweight cardio exercises to show as cardio in view,
      // even if the backend muscleGroup is calves/quads/etc.
      try {
        const name = String(ex.name || "").toLowerCase();
        const isHiitName =
          name.includes("burpee") ||
          name.includes("mountain") ||
          name.includes("climb") ||
          name.includes("jump squat") ||
          name.includes("plank jack") ||
          name.includes("skater");

        if (isHiitName) {
          ex.muscleGroup = "cardio";
        } else if (
          Array.isArray(bucket.rawSets) &&
          bucket.rawSets.some((rs: any) => rs.__kind === "cardio")
        ) {
          // If this bucket contains cardio sets, ensure the exercise is labeled as cardio
          if (
            !ex.muscleGroup ||
            ex.muscleGroup === "calves" ||
            ex.muscleGroup === "other"
          ) {
            ex.muscleGroup = "cardio";
          }
        }
      } catch (e) {}
      const noteKey = String(ex.name || "").toLowerCase();
      const notes = exerciseNotes[noteKey] || "";

      const sortedRaw = bucket.rawSets.slice().sort((a: any, b: any) => {
        const aNum = typeof a.setNumber === "number" ? a.setNumber : 0;
        const bNum = typeof b.setNumber === "number" ? b.setNumber : 0;
        return aNum - bNum;
      });

      const nameLower = String(ex.name || "").toLowerCase();
      const isHiitName =
        nameLower.includes("burpee") ||
        nameLower.includes("mountain") ||
        nameLower.includes("climb") ||
        nameLower.includes("jump squat") ||
        nameLower.includes("plank jack") ||
        nameLower.includes("skater");

      const mapped = sortedRaw.map((s: any) => {
        if (s.__kind === "cardio" || s.mode) {
          const mode = s.mode;
          const durationSeconds =
            typeof s.durationSeconds === "number" ? s.durationSeconds : 0;
          const rawDistance =
            typeof s.distance === "number" && !isNaN(s.distance)
              ? s.distance
              : 0;

          // Backend stores distance in meters for non-stairs cardio.
          // Convert to km for display so 6000 -> 6.0 km in read-only view.
          const distance = mode === "stairs" ? rawDistance : rawDistance / 1000;

          let cardioStat: number | undefined;
          if (mode === "stairs") {
            cardioStat =
              typeof s.level === "number" && !isNaN(s.level)
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

          // For HIIT/bodyweight cardio exercises, treat the stored cardio
          // fields as reps. We primarily stash HIIT reps in the `floors`
          // field to avoid DecimalField limits on `level`, but fall back to
          // the level-based stat if needed.
          let repsFromCardio = 0;
          if (isHiitName) {
            if (
              typeof s.floors === "number" &&
              !isNaN(s.floors) &&
              s.floors > 0
            ) {
              repsFromCardio = s.floors;
            } else if (
              typeof cardioStat === "number" &&
              !isNaN(cardioStat) &&
              cardioStat > 0
            ) {
              repsFromCardio = cardioStat;
            }
          }

          return {
            id: String(s.id),
            reps: repsFromCardio,
            weight: 0,
            unit: getUnit(),
            isPR: !!s.isPR,
            completed: true,
            absWeightPR: false,
            e1rmPR: false,
            volumePR: false,
            type: "S",
            rpe: undefined,
            cardioMode: mode,
            cardioDurationSeconds: durationSeconds,
            cardioDistance: distance,
            cardioStat,
            cardioDistancePR: !!s.distancePR,
            cardioPacePR: !!s.pacePR,
            cardioAscentPR: !!s.ascentPR,
            cardioIntensityPR: !!s.intensityPR,
            cardioSplitPR: !!s.splitPR,
          };
        }

        // Strength mapping (existing behavior)
        return {
          id: String(s.id),
          // number of partial reps (0..5)
          halfReps:
            typeof s.halfReps === "number"
              ? Math.max(0, Math.min(5, Math.round(s.halfReps)))
              : typeof s.half_reps === "number"
                ? Math.max(0, Math.min(5, Math.round(s.half_reps)))
                : 0,
          reps: s.reps,
          weight: typeof s.weight === "number" ? s.weight : 0,
          unit: s.unit || getUnit(),
          isPR: !!s.isPR,
          completed: true,
          absWeightPR: !!s.absWeightPR,
          e1rmPR: !!s.e1rmPR,
          volumePR: !!s.volumePR,
          type: s.type || "S",
          rpe: typeof s.rpe === "number" ? s.rpe : undefined,
        };
      });

      return {
        id: exerciseId,
        exercise: ex,
        sets: mapped,
        notes,
      };
    });
  }, [sets, cardioSets, exercises, exerciseNotes]);

  const strengthSetsCount = sets.length;
  const cardioSetsCount = cardioSets.length;

  const strengthExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    sets.forEach((s: any) => {
      if (s && s.exercise != null) {
        ids.add(String(s.exercise));
      }
    });
    return ids;
  }, [sets]);

  const cardioExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    cardioSets.forEach((c: any) => {
      if (c && c.exercise != null) {
        ids.add(String(c.exercise));
      }
    });
    return ids;
  }, [cardioSets]);

  const strengthExercisesCount = strengthExerciseIds.size;
  const cardioExercisesCount = cardioExerciseIds.size;
  const combinedExercisesCount = new Set([
    ...Array.from(strengthExerciseIds),
    ...Array.from(cardioExerciseIds),
  ]).size;

  const hasStrength = strengthSetsCount > 0;
  const hasCardio = cardioSetsCount > 0;
  const onlyStrength = hasStrength && !hasCardio;
  const onlyCardio = hasCardio && !hasStrength;
  const mixedTypes = hasStrength && hasCardio;

  const headerExercisesCount = onlyStrength
    ? strengthExercisesCount
    : onlyCardio
      ? cardioExercisesCount
      : combinedExercisesCount;

  const headerSetsCount = onlyStrength
    ? strengthSetsCount
    : onlyCardio
      ? cardioSetsCount
      : strengthSetsCount + cardioSetsCount;

  const totalVolume = sets.reduce((acc: number, s: any) => {
    const w = typeof s.weight === "number" ? s.weight : 0;
    const r = typeof s.reps === "number" ? s.reps : Number(s.reps || 0);
    return acc + w * r;
  }, 0);

  let totalDistanceMeters = 0;
  let totalFloors = 0;
  cardioSets.forEach((c: any) => {
    const mode = c?.mode;
    if (mode === "stairs") {
      if (typeof c.floors === "number") {
        totalFloors += c.floors;
      }
    } else {
      if (typeof c.distance === "number") {
        totalDistanceMeters += c.distance;
      }
    }
  });
  const totalDistanceKm = totalDistanceMeters / 1000;
  let cardioDistanceDisplay = "-";
  if (totalDistanceKm > 0 && totalFloors > 0) {
    cardioDistanceDisplay = `${totalDistanceKm.toFixed(
      2,
    )} km + ${totalFloors} floors`;
  } else if (totalDistanceKm > 0) {
    cardioDistanceDisplay = `${totalDistanceKm.toFixed(2)} km`;
  } else if (totalFloors > 0) {
    cardioDistanceDisplay = `${totalFloors} floors`;
  }

  const prCount =
    sets.reduce((acc: number, s: any) => acc + countPrTypesFromSet(s), 0) +
    cardioSets.reduce((acc: number, s: any) => acc + countPrTypesFromSet(s), 0);

  // handle Android hardware back button in Capacitor builds
  useEffect(() => {
    let removeHandler: (() => void) | undefined;
    (async () => {
      try {
        const mod = await new Function('return import("@capacitor/app")')();
        if (mod && mod.App && typeof mod.App.addListener === "function") {
          const handle = await mod.App.addListener("backButton", () => {
            // prefer router back, fallback to workouts list
            try {
              navigate(-1);
            } catch (e) {
              navigate("/workouts");
            }
          });
          removeHandler = () => handle.remove();
        }
      } catch (e) {
        // not running in Capacitor/native environment — ignore
      }
    })();

    return () => {
      try {
        if (removeHandler) removeHandler();
      } catch (e) {}
    };
  }, [navigate]);

  return (
    <AppLayout>
      <div className="space-y-6 pt-4">
        {/* Unified Header Row */}
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => {
              try {
                navigate(-1);
              } catch (e) {
                navigate("/workouts");
              }
            }}
            aria-label="Back"
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-xl font-bold text-white leading-tight truncate">
              {workout?.name || "Workout"}
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">
              {workout?.duration
                ? formatMinutes(workout.duration)
                : "Logged workout"}
            </p>
          </div>

          <div className="shrink-0 relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Workout actions"
                  className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="absolute right-0 top-full mt-1 z-[110] min-w-[160px] rounded-2xl bg-zinc-900/98 backdrop-blur-md border border-white/5 p-0 text-left font-sans text-sm">
                <div>
                  <DropdownMenuItem
                    className="px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 rounded cursor-pointer leading-tight text-left font-medium"
                    onClick={() => navigate(`/workouts/${id}/edit`)}
                  >
                    Edit workout
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="px-4 py-2 text-sm text-red-500 hover:bg-white/5 rounded cursor-pointer border-t border-white/5 leading-tight text-left font-semibold"
                    onClick={() => setShowDiscardConfirm(true)}
                  >
                    Delete workout
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 rounded cursor-pointer leading-tight text-left font-medium"
                    onClick={async () => {
                      try {
                        if (!workout) return;
                        const templateExercises = grouped.map((we, index) => ({
                          id: `from-${we.id}-${crypto.randomUUID()}`,
                          exercise: we.exercise,
                          targetSets: we.sets.length,
                          targetReps: we.sets[0]?.reps || 0,
                          order: index + 1,
                        }));

                        const newRoutine: Routine = {
                          id: `workout-${workout.id}`,
                          name: workout.name || `Routine from ${workout.name}`,
                          description:
                            workout.notes || `Routine created from workout`,
                          createdAt: new Date(),
                          exercises: templateExercises,
                        };

                        let stored: Routine[] = [];
                        const raw = localStorage.getItem("user:routines");
                        if (raw) stored = JSON.parse(raw);
                        const updated = [
                          ...stored.filter((r) => r.id !== newRoutine.id),
                          newRoutine,
                        ];
                        localStorage.setItem(
                          "user:routines",
                          JSON.stringify(updated),
                        );
                        queryClient.invalidateQueries({
                          queryKey: ["routines"],
                        });
                        toast({ title: "Saved to routines" });
                      } catch (err) {
                        toast({ title: "Failed", variant: "destructive" });
                      }
                    }}
                  >
                    Add to routine
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Row — premium pill cards */}
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-3 gap-0.5 flex-1 min-w-[72px]">
            <span className="text-xl font-bold text-white tabular-nums">
              {headerExercisesCount}
            </span>
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
              Exercises
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-3 gap-0.5 flex-1 min-w-[72px]">
            <span className="text-xl font-bold text-white tabular-nums">
              {headerSetsCount}
            </span>
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
              Sets
            </span>
          </div>

          {(onlyStrength || mixedTypes) && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-3 gap-0.5 flex-1 min-w-[72px]">
              <span className="text-xl font-bold text-white tabular-nums">
                {totalVolume > 0 ? totalVolume.toLocaleString() : "0"}
              </span>
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                Vol · {getUnit()}
              </span>
            </div>
          )}

          {(onlyStrength || mixedTypes) && prCount > 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 px-3 py-3 gap-0.5 flex-1 min-w-[72px]">
              <span className="text-xl font-bold text-orange-400 tabular-nums">
                {prCount}
              </span>
              <span className="text-[10px] font-medium text-orange-500/70 uppercase tracking-widest">
                PRs 🏆
              </span>
            </div>
          )}

          {(onlyCardio || mixedTypes) && cardioDistanceDisplay !== "-" && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-3 gap-0.5 flex-1 min-w-[72px]">
              <span className="text-xl font-bold text-white tabular-nums">
                {cardioDistanceDisplay}
              </span>
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                Distance
              </span>
            </div>
          )}
        </div>

        {/* Exercise Cards List */}
        <div className="space-y-6">
          {grouped.map((we) => (
            <Card key={we.id} className="w-full rounded-2xl overflow-hidden">
              <CardContent className="px-1 py-3 sm:p-4 overflow-hidden">
                <div className="mb-3">
                  <ExerciseHeader
                    exerciseName={we.exercise.name}
                    muscleGroup={we.exercise.muscleGroup}
                    isCustom={we.exercise.custom}
                    onClick={() => {
                      try {
                        const exId = String(we.exercise.id);
                        navigate(`/exercises/${exId}/info`, {
                          state: {
                            exerciseName: we.exercise.name,
                            muscleGroup: we.exercise.muscleGroup,
                          },
                        });
                      } catch (e) {}
                    }}
                  />
                  {we.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {we.notes}
                    </p>
                  )}
                </div>

                <SetsHeader
                  muscleGroup={we.exercise.muscleGroup}
                  exerciseName={we.exercise.name}
                />
                <div className="space-y-2">
                  {we.sets.map((s: any, idx: number) => (
                    <SetRow
                      key={s.id}
                      set={s}
                      exerciseName={we.exercise.name}
                      unit={s.unit}
                      setNumber={idx + 1}
                      onUpdate={() => {}}
                      onUnitChange={() => {}}
                      onComplete={() => {}}
                      readOnly
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ExerciseInfo modal removed; navigation now goes to ExerciseHistory page */}

      {showDiscardConfirm && (
        <div className="fixed left-1/2 top-1/3 z-[9999] -translate-x-1/2 w-[min(520px,90%)]">
          <div className="rounded-lg border border-border bg-neutral-900 p-6 shadow-lg">
            <div className="mb-4 text-center text-lg font-semibold text-white">
              Delete Workout?
            </div>
            <div className="text-sm text-muted-foreground mb-4 text-center">
              Are you sure you want to delete this workout? This cannot be
              undone.
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={() => {
                  if (id) deleteMutation.mutate(id);
                  setShowDiscardConfirm(false);
                }}
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                className="px-4 py-2 rounded border border-border text-white bg-transparent"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
