const GRID_TEMPLATE =
  "minmax(25px, 0.25fr) minmax(65px, 0.7fr) 6px minmax(25px, 0.65fr) minmax(30px, 0.35fr) 28px 30px";

// Match cardio row layout from SetRow: Set | Duration | Distance/Floors | Level/Split | PR | Check
const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.4fr) minmax(60px, 0.6fr) minmax(60px, 0.8fr) minmax(30px, 0.25fr) 28px 30px";

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
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkouts,
  getSets,
  getExercises,
  deleteWorkout,
  getCardioSetsForWorkout,
} from "@/lib/api";
import { getUnit, formatMinutes } from "@/lib/utils";
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
      // If this bucket contains cardio sets, ensure the exercise is labeled as cardio
      try {
        if (
          Array.isArray(bucket.rawSets) &&
          bucket.rawSets.some((rs: any) => rs.__kind === "cardio")
        ) {
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

          return {
            id: String(s.id),
            reps: 0,
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

  const prCount = sets.reduce((acc: number, s: any) => {
    return acc + (s.isPR || s.absWeightPR || s.e1rmPR || s.volumePR ? 1 : 0);
  }, 0);

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
      <div className="space-y-6">
        {/* Title and Duration Block */}
        <div className="flex items-center justify-between mb-0 -mt-8">
          <div className="pl-0">
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
              className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="pr-0 relative">
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

        <div>
          <h1 className="font-heading text-3xl font-bold text-white">
            {workout?.name || "Workout"}
          </h1>
          <p className="text-muted-foreground">
            {workout?.duration
              ? formatMinutes(workout.duration)
              : "Logged workout"}
          </p>
        </div>

        {/* Unified Stats and Buttons Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 items-center">
            <div className="flex flex-col items-center justify-center bg-neutral-800/60 text-white rounded-lg px-3 py-2 min-w-[64px] sm:min-w-[84px]">
              <div className="text-lg sm:text-xl font-semibold">
                {headerExercisesCount}
              </div>
              <div className="text-[9px] sm:text-[10px] opacity-90">
                Exercises
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-neutral-800/60 text-white rounded-lg px-3 py-2 min-w-[64px] sm:min-w-[84px]">
              <div className="text-lg sm:text-xl font-semibold">
                {headerSetsCount}
              </div>
              <div className="text-[9px] sm:text-[10px] opacity-90">Sets</div>
            </div>

            {(onlyStrength || mixedTypes) && (
              <div className="flex flex-col items-center justify-center bg-neutral-800/60 text-white rounded-lg px-3 py-2 min-w-[80px] sm:min-w-[100px]">
                <div className="text-lg sm:text-xl font-semibold">
                  {totalVolume > 0 ? totalVolume.toLocaleString() : "0"}
                </div>
                <div className="text-[9px] sm:text-[10px] opacity-90">
                  Volume ({getUnit()})
                </div>
              </div>
            )}

            {(onlyCardio || mixedTypes) && (
              <div className="flex flex-col items-center justify-center bg-neutral-800/60 text-white rounded-lg px-3 py-2 min-w-[80px] sm:min-w-[120px]">
                <div className="text-lg sm:text-xl font-semibold">
                  {cardioDistanceDisplay}
                </div>
                <div className="text-[9px] sm:text-[10px] opacity-90">
                  Distance
                </div>
              </div>
            )}

            {(onlyStrength || mixedTypes) && (
              <div className="flex flex-col items-center justify-center bg-neutral-800/60 text-white rounded-lg px-3 py-2 min-w-[64px] sm:min-w-[84px]">
                <div className="text-lg sm:text-xl font-semibold">
                  {prCount}
                </div>
                <div className="text-[9px] sm:text-[10px] opacity-90">PRs</div>
              </div>
            )}
          </div>

          {/* Action Buttons placeholder (moved to header) */}
          <div className="ml-auto flex gap-2 items-center" />
        </div>

        {/* Exercise Cards List */}
        <div className="space-y-6">
          {grouped.map((we) => (
            <Card key={we.id} className="w-full">
              <CardContent className="px-1 py-3 sm:p-4 overflow-hidden">
                <div className="mb-3">
                  <h3 className="font-heading text-lg font-semibold text-white">
                    {we.exercise.name}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {we.exercise.muscleGroup === "other"
                      ? "calves"
                      : we.exercise.muscleGroup}
                  </div>
                  {we.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {we.notes}
                    </p>
                  )}
                </div>

                <div className="relative w-full overflow-hidden">
                  <div className="w-full">
                    <div
                      className="mb-1.5 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                      style={{
                        gridTemplateColumns:
                          we.exercise.muscleGroup === "cardio"
                            ? GRID_TEMPLATE_CARDIO
                            : GRID_TEMPLATE,
                      }}
                    >
                      {we.exercise.muscleGroup === "cardio" ? (
                        <>
                          <span className="flex justify-center">SET</span>
                          <span className="flex justify-center">DURATION</span>

                          <span className="flex justify-center">
                            {we.exercise.name.toLowerCase().includes("stair")
                              ? "FLOORS"
                              : "DISTANCE"}
                          </span>

                          <span className="flex justify-center">
                            {we.exercise.name
                              .toLowerCase()
                              .includes("treadmill")
                              ? "INCLINE"
                              : we.exercise.name.toLowerCase().includes("row")
                                ? "SPLIT"
                                : "LEVEL"}
                          </span>

                          <span className="flex justify-center">
                            <Trophy className="h-3.5 w-3.5" />
                          </span>

                          <div />
                        </>
                      ) : (
                        <>
                          <span className="flex justify-center">SET</span>
                          <span className="flex justify-center">WEIGHT</span>
                          <span />
                          <span className="flex justify-center">REPS</span>
                          <span className="flex justify-center">RPE</span>
                          <span className="flex justify-center">
                            <Trophy className="h-3.5 w-3.5" />
                          </span>
                          <div />
                        </>
                      )}
                    </div>

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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
