// In EditWorkout.tsx (or ViewWorkout.tsx)
const GRID_TEMPLATE =
  "minmax(20px, 0.4fr) minmax(65px, 0.8fr) 6px minmax(25px, 0.4fr) minmax(30px, 0.4fr) 32px 30px";

const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.4fr) minmax(60px, 0.6fr) minmax(60px, 0.8fr) minmax(30px, 0.25fr) 32px 30px";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Save,
  Trash2,
  Clock,
  ChevronDown,
  ChevronRight,
  Trophy,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { SetRow } from "@/components/workout/SetRow";
import { Input } from "@/components/ui/input";
import { getUnit, formatMinutes } from "@/lib/utils";
import type { WorkoutExercise, WorkoutSet, Exercise } from "@/types/workout";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { muscleGroupColors } from "@/data/mockData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExercises,
  getSets,
  getWorkouts,
  createExercise,
  createSet,
  createCardioSet,
  updateSet,
  updateWorkout,
  deleteSet,
  createWorkout,
} from "@/lib/api";
import { getCardioSetsForWorkout } from "@/lib/api";
import { libraryExercises as staticLibraryExercises } from "@/data/libraryExercises";

export default function EditWorkout() {
  const { id } = useParams();
  const workoutId = id || null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workoutName, setWorkoutName] = useState("Workout");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [startTime, setStartTime] = useState(new Date());
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
  const [editDurationHours, setEditDurationHours] = useState(0);
  const [editDurationMinutes, setEditDurationMinutes] = useState(0);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);

  const { data: userExercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });
  const [prBanner, setPrBanner] = useState<{
    exerciseName: string;
    label: string;
    value: string;
  } | null>(null);
  const [prQueue, setPrQueue] = useState<
    {
      exerciseName: string;
      label: string;
      value: string;
    }[]
  >([]);
  const [prVisible, setPrVisible] = useState(false);

  const allExercises = useMemo(() => {
    const map = new Map<string, Exercise>();
    staticLibraryExercises.forEach((e) => map.set(e.name.toLowerCase(), e));
    userExercises.forEach((e) => map.set(e.name.toLowerCase(), e));
    return Array.from(map.values());
  }, [userExercises]);

  const availableMuscleGroups = useMemo(() => {
    return Array.from(new Set(allExercises.map((e) => e.muscleGroup)));
  }, [allExercises]);

  const chipClassFor = (mg: string, active: boolean) => {
    const raw = muscleGroupColors[mg] || "bg-muted/20 text-white";
    const parts = raw.split(" ");
    const bg = parts[0] || "bg-muted/20";
    if (active) {
      // make solid bg by removing slash opacity if present
      const solid = bg.replace("/20", "");
      return `${solid} text-white`;
    }
    return `${bg} text-white`;
  };

  // replacement dropdown state
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [replaceFilter, setReplaceFilter] = useState<string | null>(null);
  // Add-exercise dialog state (reuse NewWorkout UI)
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState<"all" | string>("all");

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    return allExercises.filter((exercise) => {
      if (filterMuscle !== "all" && exercise.muscleGroup !== filterMuscle)
        return false;
      if (!q) return true;
      return (
        exercise.name.toLowerCase().includes(q) ||
        exercise.muscleGroup.toLowerCase().includes(q)
      );
    });
  }, [exerciseSearch, allExercises, filterMuscle]);

  const replaceExercise = (exerciseLocalId: string, newEx: Exercise) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseLocalId
          ? {
              ...ex,
              exercise: newEx,
              // clear sets so user must re-register
              sets: [
                {
                  id: crypto.randomUUID(),
                  reps: 0,
                  halfReps: 0,
                  weight: 0,
                  unit: getUnit(),
                  isPR: false,
                  completed: false,
                  type: "S",
                  rpe: undefined,
                },
              ],
            }
          : ex
      )
    );
    setReplaceTarget(null);
    setReplaceFilter(null);
    setIsExerciseDialogOpen(false);
    setExerciseSearch("");
    setFilterMuscle("all");
  };

  useEffect(() => {
    if (!workoutId) return;
    // load workout info and sets
    (async () => {
      try {
        const workouts = await getWorkouts();
        const workout = workouts.find(
          (w) => String(w.id) === String(workoutId)
        );
        if (workout) {
          setWorkoutName(workout.name || "Workout");
          setNotes(workout.notes || "");
          // initialize startTime from the workout's stored date so edits
          // to the date field are based on the correct original value
          try {
            if (workout.date instanceof Date) {
              setStartTime(workout.date);
            }
          } catch (e) {}
          if (typeof (workout as any).duration === "number") {
            setDurationMinutes((workout as any).duration as number);
          }
        }
        const sets = await getSets(String(workoutId));
        // also fetch cardio sets so cardio exercises appear in edit mode
        const cardioSets = await getCardioSetsForWorkout(String(workoutId));
        // load any saved per-exercise notes from localStorage
        let notesMap: Record<string, string> = {};
        try {
          const raw = localStorage.getItem(
            `workout:exerciseNotes:${workoutId}`
          );
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              notesMap = parsed as Record<string, string>;
            }
          }
        } catch (e) {}
        // group strength and cardio sets by exercise id
        const m = new Map<string, any[]>();
        sets.forEach((s: any) => {
          if (!m.has(s.exercise)) m.set(s.exercise, []);
          m.get(s.exercise).push({ __kind: "strength", ...s });
        });
        (cardioSets || []).forEach((c: any) => {
          if (!m.has(c.exercise)) m.set(c.exercise, []);
          m.get(c.exercise).push({ __kind: "cardio", ...c });
        });

        const grouped = Array.from(m.entries()).map(([exerciseId, sets]) => {
          const exerciseRecord = userExercises.find(
            (ue) => String(ue.id) === String(exerciseId)
          );
          const exerciseName = (exerciseRecord || { name: exerciseId }).name;
          const exerciseMuscle = (exerciseRecord || { muscleGroup: "calves" })
            .muscleGroup;
          const noteKey = exerciseName.toLowerCase();
          const exerciseNotes = notesMap[noteKey] || "";

          return {
            id: crypto.randomUUID(),
            exercise: {
              id: exerciseId,
              name: exerciseName,
              muscleGroup: exerciseMuscle,
            } as Exercise,
            notes: exerciseNotes,
            sets: sets
              .slice()
              .sort((a: any, b: any) => (a.setNumber || 0) - (b.setNumber || 0))
              .map((s: any) => {
                if (s.__kind === "strength") {
                  return {
                    id: String(s.id),
                    reps: s.reps,
                    halfReps: (s as any).halfReps || 0,
                    weight: s.weight || 0,
                    unit: s.unit || getUnit(),
                    isPR: s.isPR,
                    completed: true,
                    type: s.type || "S",
                    rpe: s.rpe,
                  } as WorkoutSet;
                }

                // Cardio set mapping: convert backend meters -> km for UI
                const mode = s.mode as any;
                const durationSeconds =
                  typeof s.durationSeconds === "number"
                    ? s.durationSeconds
                    : s.duration_seconds ?? 0;
                const distanceMeters =
                  typeof s.distance === "number"
                    ? s.distance
                    : s.distance_meters ?? undefined;
                const floors =
                  typeof s.floors === "number"
                    ? s.floors
                    : s.floors ?? undefined;
                const level =
                  typeof s.level === "number" ? s.level : s.level ?? undefined;
                const splitSeconds =
                  typeof s.splitSeconds === "number"
                    ? s.splitSeconds
                    : s.split_seconds ?? undefined;

                let uiDistance: number | undefined = undefined;
                if (mode === "stairs") {
                  uiDistance =
                    typeof floors === "number" ? floors : distanceMeters;
                } else {
                  uiDistance =
                    typeof distanceMeters === "number"
                      ? distanceMeters / 1000
                      : undefined;
                }

                let uiStat = 0;
                if (mode === "row")
                  uiStat =
                    typeof splitSeconds === "number"
                      ? splitSeconds
                      : level ?? 0;
                else if (mode === "stairs")
                  uiStat = typeof level === "number" ? level : 0;
                else uiStat = typeof level === "number" ? level : 0;

                return {
                  id: String(s.id),
                  reps: 0,
                  weight: 0,
                  unit: getUnit(),
                  isPR: !!s.isPR,
                  completed: true,
                  type: "S",
                  rpe: undefined,
                  cardioMode: mode,
                  cardioDurationSeconds: durationSeconds,
                  cardioDistanceUnit: "km",
                  cardioDistance:
                    typeof uiDistance === "number" ? uiDistance : 0,
                  cardioStat: uiStat,
                  // preserve PR flags
                  cardioDistancePR: !!s.distancePR,
                  cardioPacePR: !!s.pacePR,
                  cardioAscentPR: !!s.ascentPR,
                  cardioIntensityPR: !!s.intensityPR,
                  cardioSplitPR: !!s.splitPR,
                } as WorkoutSet;
              }),
          } as WorkoutExercise;
        });
        setExercises(grouped as WorkoutExercise[]);
      } catch (err: any) {
        toast({
          title: "Failed to load workout",
          description: String(err),
          variant: "destructive",
        });
      }
    })();
  }, [workoutId, userExercises]);

  // PR banner queue handling (show next banner when available)
  useEffect(() => {
    if (!prVisible && !prBanner && prQueue.length > 0) {
      const [next, ...rest] = prQueue;
      setPrBanner(next);
      setPrQueue(rest);
      setPrVisible(true);
    }
  }, [prVisible, prBanner, prQueue]);

  useEffect(() => {
    if (!prVisible) return;
    const timer = setTimeout(() => setPrVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [prVisible]);

  useEffect(() => {
    if (prVisible || !prBanner) return;
    const timer = setTimeout(() => setPrBanner(null), 300);
    return () => clearTimeout(timer);
  }, [prVisible, prBanner]);

  const getDuration = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 60000);
    return diff;
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const formatDateLabel = (d: Date) =>
    d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const setStartDateOnly = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);
    // Do not allow selecting a future date
    if (candidate.getTime() > today.getTime()) {
      return;
    }
    const dt = new Date(startTime);
    dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setStartTime(dt);
  };

  const addExercise = (exercise: Exercise) => {
    const newExercise: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise,
      notes: "",
      sets: [
        {
          id: crypto.randomUUID(),
          reps: 0,
          halfReps: 0,
          weight: 0,
          unit: getUnit(),
          isPR: false,
          completed: false,
          type: "S" as const,
          rpe: undefined,
        },
      ],
    };
    setExercises((prev) => [...prev, newExercise]);
    setIsExerciseDialogOpen(false);
    setExerciseSearch("");
    setFilterMuscle("all");
  };

  const addSet = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: crypto.randomUUID(),
                reps: lastSet?.reps || 0,
                halfReps: (lastSet as any)?.halfReps || 0,
                weight: lastSet?.weight || 0,
                unit: lastSet?.unit || getUnit(),
                isPR: false,
                completed: false,
                type: (lastSet as any)?.type || "S",
                rpe:
                  typeof (lastSet as any)?.rpe === "number"
                    ? (lastSet as any).rpe
                    : undefined,
              },
            ],
          };
        }
        return ex;
      })
    );
  };

  const updateSetLocal = (
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>
  ) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.id === setId ? { ...set, ...updates } : set
            ),
          };
        }
        return ex;
      })
    );
  };

  // Persist a single set change immediately (toggle complete or other edits)
  const handleSetComplete = async (exerciseLocalId: string, setId: string) => {
    const ex = exercises.find((e) => e.id === exerciseLocalId);
    if (!ex || !workoutId) return;
    const s = ex.sets.find((ss) => ss.id === setId);
    if (!s) return;

    // optimistic toggle
    updateSetLocal(exerciseLocalId, setId, { completed: !s.completed });

    // Only treat this as a PR-eligible action when the set is being
    // marked complete (check button turns green). Un-completing a set
    // should not trigger PR detection or banners.
    const nowCompleted = !s.completed;
    if (!nowCompleted) return;

    try {
      let exId: any = ex.exercise.id;
      const isNumeric = /^[0-9]+$/.test(String(exId));
      if (!isNumeric) {
        const normalize = (str: string) =>
          str
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
        const match = (userExercises as any[]).find(
          (ue) => normalize(ue.name) === normalize((ex.exercise as any).name)
        );
        if (match) exId = match.id;
        else {
          const createdEx = await createExercise(
            (ex.exercise as any).name,
            (ex.exercise as any).muscleGroup || "calves",
            ""
          );
          exId = createdEx.id;
          setExercises((prev) =>
            prev.map((ee) =>
              ee.id === exerciseLocalId
                ? { ...ee, exercise: { ...(ee.exercise as any), id: exId } }
                : ee
            )
          );
        }
      }

      const payload: any = {
        reps: s.reps || 0,
        halfReps: (s as any).halfReps || 0,
        weight: typeof s.weight === "undefined" ? null : s.weight,
        unit: s.unit || getUnit(),
        type: (s as any).type,
        rpe: typeof (s as any).rpe === "number" ? (s as any).rpe : undefined,
      };

      // Determine whether this workout should be allowed to introduce new PRs.
      // For past-dated workouts we keep existing PR flags but do not create
      // new ones when editing, so retro changes don't show new trophies.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const workoutDay = new Date(startTime);
      workoutDay.setHours(0, 0, 0, 0);
      const allowPrForWorkout = workoutDay.getTime() >= today.getTime();

      if (/^[0-9]+$/.test(String(s.id))) {
        const saved = await updateSet(String(s.id), payload);
        try {
          if (
            !allowPrForWorkout &&
            (saved.isPR || saved.absWeightPR || saved.e1rmPR || saved.volumePR)
          ) {
            localStorage.setItem(`set:prOverride:${saved.id}`, "0");
          } else if (allowPrForWorkout) {
            localStorage.removeItem(`set:prOverride:${saved.id}`);
          }
        } catch (e) {}
        setExercises((prev) =>
          prev.map((ee) =>
            ee.id !== exerciseLocalId
              ? ee
              : {
                  ...ee,
                  sets: ee.sets.map((ss: any) =>
                    ss.id !== setId
                      ? ss
                      : {
                          ...ss,
                          // For historical workouts, only keep existing PR
                          // flags or clear them; never introduce new ones.
                          isPR: allowPrForWorkout
                            ? saved.isPR
                            : saved.isPR
                            ? ss.isPR
                            : false,
                          absWeightPR: allowPrForWorkout
                            ? saved.absWeightPR
                            : saved.absWeightPR
                            ? ss.absWeightPR
                            : false,
                          e1rmPR: allowPrForWorkout
                            ? saved.e1rmPR
                            : saved.e1rmPR
                            ? ss.e1rmPR
                            : false,
                          volumePR: allowPrForWorkout
                            ? saved.volumePR
                            : saved.volumePR
                            ? ss.volumePR
                            : false,
                          // repPR removed per UX request
                          unit: saved.unit || ss.unit,
                        }
                  ),
                }
          )
        );
        // Show PR banners only for current-day workouts; historical
        // workouts skip celebrations to avoid noisy retro PRs.
        if (
          allowPrForWorkout &&
          (saved.isPR || saved.absWeightPR || saved.e1rmPR || saved.volumePR)
        ) {
          const unit = (saved.unit as "lbs" | "kg" | undefined) || getUnit();
          const weight = typeof saved.weight === "number" ? saved.weight : 0;
          const reps = saved.reps;
          const exerciseName = (ex.exercise as any).name;
          const banners: any[] = [];
          if (saved.absWeightPR && weight > 0)
            banners.push({
              exerciseName,
              label: "Heaviest Weight",
              value: `${weight.toFixed(1)} ${unit}`,
            });
          if (saved.e1rmPR && weight > 0 && reps > 0 && reps < 37) {
            const est1rm = (weight * 36) / (37 - reps);
            banners.push({
              exerciseName,
              label: "Best 1RM",
              value: `${est1rm.toFixed(1)} ${unit}`,
            });
          }
          if (saved.volumePR && weight > 0 && reps > 0) {
            const LBS_PER_KG = 2.20462;
            const volumeKg =
              unit === "kg" ? weight * reps : (weight / LBS_PER_KG) * reps;
            banners.push({
              exerciseName,
              label: "Best Set Volume",
              value: `${volumeKg.toFixed(1)} kg`,
            });
          }
          if (banners.length > 0) setPrQueue((prev) => [...prev, ...banners]);
        }
      } else {
        let created: any;
        try {
          created = await createSet({
            workoutId: workoutId,
            exerciseId: exId,
            setNumber: s.setNumber || 1,
            reps: s.reps || 0,
            halfReps: (s as any).halfReps || 0,
            weight: s.weight,
            unit: s.unit || getUnit(),
            type: s.type,
            rpe:
              typeof (s as any).rpe === "number" ? (s as any).rpe : undefined,
          });
        } catch (err: any) {
          // Prefer structured error body if available (createSet now attaches parsed JSON to `err.body`).
          const body = err && (err as any).body ? (err as any).body : null;
          const text = String(err || "").toLowerCase();

          const mentionsInvalidPk =
            (body &&
              JSON.stringify(body).toLowerCase().includes("invalid pk")) ||
            text.includes("invalid pk") ||
            text.includes("object does not exist");
          const mentionsWorkout =
            (body && JSON.stringify(body).toLowerCase().includes("workout")) ||
            (text.includes("workout") && text.includes("does not exist"));
          const mentionsExercise =
            (body && JSON.stringify(body).toLowerCase().includes("exercise")) ||
            (text.includes("exercise") && text.includes("does not exist"));

          if (mentionsInvalidPk || mentionsWorkout || mentionsExercise) {
            if (mentionsExercise) {
              try {
                const createdEx = await createExercise(
                  (ex.exercise as any).name,
                  (ex.exercise as any).muscleGroup || "calves",
                  ""
                );
                exId = createdEx.id;
                setExercises((prev) =>
                  prev.map((ee) =>
                    ee.id === ex.id
                      ? {
                          ...ee,
                          exercise: { ...(ee.exercise as any), id: exId },
                        }
                      : ee
                  )
                );
              } catch (createExErr) {
                throw err;
              }
            }

            if (mentionsWorkout || mentionsInvalidPk) {
              const w = await createWorkout(workoutName);
              // update local workoutId to newly created
              // Note: workoutId captured from route; replace to new id
              // This is a fallback if backend lost the workout record
              // but keep existing workoutId for subsequent calls
            }

            // retry once
            created = await createSet({
              workoutId: workoutId,
              exerciseId: exId,
              setNumber: s.setNumber || 1,
              reps: s.reps || 0,
              halfReps: (s as any).halfReps || 0,
              weight: s.weight,
              unit: s.unit || getUnit(),
              type: s.type,
              rpe:
                typeof (s as any).rpe === "number" ? (s as any).rpe : undefined,
            });
          } else {
            throw err;
          }
        }

        try {
          if (
            !allowPrForWorkout &&
            (created.isPR ||
              created.absWeightPR ||
              created.e1rmPR ||
              created.volumePR)
          ) {
            localStorage.setItem(`set:prOverride:${created.id}`, "0");
          } else if (allowPrForWorkout) {
            localStorage.removeItem(`set:prOverride:${created.id}`);
          }
        } catch (e) {}

        setExercises((prev) =>
          prev.map((ee) =>
            ee.id !== exerciseLocalId
              ? ee
              : {
                  ...ee,
                  sets: ee.sets.map((ss: any) =>
                    ss.id !== setId
                      ? ss
                      : {
                          ...ss,
                          id: created.id,
                          // New sets added via EditWorkout on historical
                          // workouts should not introduce new PR flags.
                          isPR: allowPrForWorkout ? created.isPR : false,
                          absWeightPR: allowPrForWorkout
                            ? created.absWeightPR
                            : false,
                          e1rmPR: allowPrForWorkout ? created.e1rmPR : false,
                          volumePR: allowPrForWorkout
                            ? created.volumePR
                            : false,
                          // repPR removed per UX request
                          unit: created.unit || ss.unit,
                        }
                  ),
                }
          )
        );
        // For newly created sets we follow the same rule: show
        // banners only for current-day workouts.
        if (
          allowPrForWorkout &&
          (created.isPR ||
            created.absWeightPR ||
            created.e1rmPR ||
            created.volumePR)
        ) {
          const unit = (created.unit as "lbs" | "kg" | undefined) || getUnit();
          const weight =
            typeof created.weight === "number" ? created.weight : 0;
          const reps = created.reps;
          const exerciseName = (ex.exercise as any).name;
          const banners: any[] = [];
          if (created.absWeightPR && weight > 0)
            banners.push({
              exerciseName,
              label: "Heaviest Weight",
              value: `${weight.toFixed(1)} ${unit}`,
            });
          if (created.e1rmPR && weight > 0 && reps > 0 && reps < 37) {
            const est1rm = (weight * 36) / (37 - reps);
            banners.push({
              exerciseName,
              label: "Best 1RM",
              value: `${est1rm.toFixed(1)} ${unit}`,
            });
          }
          if (created.volumePR && weight > 0 && reps > 0) {
            const LBS_PER_KG = 2.20462;
            const volumeKg =
              unit === "kg" ? weight * reps : (weight / LBS_PER_KG) * reps;
            banners.push({
              exerciseName,
              label: "Best Set Volume",
              value: `${volumeKg.toFixed(1)} kg`,
            });
          }
          if (banners.length > 0) setPrQueue((prev) => [...prev, ...banners]);
        }
      }
    } catch (err: any) {
      toast({
        title: "Failed to update set",
        description: String(err),
        variant: "destructive",
      });
      // revert optimistic toggle
      updateSetLocal(exerciseLocalId, setId, { completed: s.completed });
    }
  };

  const saveEditedWorkout = async () => {
    if (!workoutId) return;
    // Use a mutable local workout id so we can recreate the backend workout
    // and retry set creation if the server reports the workout record is missing.
    let curWorkoutId: string | null = workoutId;

    // Determine once whether this workout date should be allowed to
    // introduce new PRs. Historical workouts (before today) should not
    // create visible PRs when retro-edited.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDay = new Date(startTime);
    workoutDay.setHours(0, 0, 0, 0);
    const allowPrForWorkout = workoutDay.getTime() >= today.getTime();
    try {
      // Persist name, notes, and (optionally) edited workout date
      const pad = (n: number) => String(n).padStart(2, "0");
      const workoutDate = `${startTime.getFullYear()}-${pad(
        startTime.getMonth() + 1
      )}-${pad(startTime.getDate())}`;

      await updateWorkout(workoutId, {
        name: workoutName,
        notes,
        date: workoutDate,
      });

      // delete existing sets then recreate
      const original = await getSets(workoutId);
      for (const s of original) {
        try {
          await deleteSet(String(s.id));
        } catch (e) {}
      }

      // ensure exercises exist and create sets
      for (const ex of exercises) {
        let exId: any = ex.exercise.id;
        if (!/^[0-9]+$/.test(String(exId))) {
          const normalize = (s: string) =>
            s
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .trim();
          const match = userExercises.find(
            (ue) => normalize(ue.name) === normalize(ex.exercise.name)
          );
          if (match) {
            exId = match.id;
          } else {
            const created = await createExercise(
              ex.exercise.name,
              (ex.exercise as any).muscleGroup || "calves",
              ""
            );
            exId = created.id;
          }
        }

        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          try {
            // If this exercise is a cardio exercise, call the cardio endpoint
            let created: any;
            if (ex.exercise.muscleGroup === "cardio") {
              const mode = s.cardioMode || "treadmill";
              const durationSeconds = s.cardioDurationSeconds ?? 0;
              const rawDistance = s.cardioDistance ?? 0;
              const rawStat = s.cardioStat ?? 0;
              const distanceUnit =
                (s as any).cardioDistanceUnit === "mile" ? "mile" : "km";

              let distance: number | undefined;
              let floors: number | undefined;
              let level: number | undefined;
              let splitSeconds: number | undefined;

              if (mode === "stairs") {
                floors = rawDistance || undefined;
                level = rawStat || undefined;
              } else {
                const distanceMeters =
                  rawDistance && distanceUnit === "mile"
                    ? Math.round(rawDistance * 1609.34)
                    : rawDistance
                    ? Math.round(rawDistance * 1000)
                    : undefined;
                if (mode === "row") {
                  distance = distanceMeters || undefined;
                  splitSeconds = rawStat || undefined;
                } else {
                  distance = distanceMeters || undefined;
                  level = rawStat || undefined;
                }
              }

              created = await createCardioSet({
                workoutId: curWorkoutId as string,
                exerciseId: exId,
                mode: mode as any,
                durationSeconds,
                distance,
                floors,
                level,
                splitSeconds,
              });
            } else {
              created = await createSet({
                workoutId: curWorkoutId as string,
                exerciseId: exId,
                setNumber: i + 1,
                reps: s.reps || 0,
                halfReps: (s as any).halfReps || 0,
                weight: s.weight,
                unit: s.unit || getUnit(),
                type: s.type,
                rpe: s.rpe,
              });
            }
            try {
              if (
                !allowPrForWorkout &&
                (created.isPR ||
                  created.absWeightPR ||
                  created.e1rmPR ||
                  created.volumePR)
              ) {
                localStorage.setItem(`set:prOverride:${created.id}`, "0");
              } else if (allowPrForWorkout) {
                localStorage.removeItem(`set:prOverride:${created.id}`);
              }
            } catch (e) {}
          } catch (err: any) {
            // Prefer structured error body if available
            const body = err && (err as any).body ? (err as any).body : null;
            const text = String(err || "").toLowerCase();

            const mentionsInvalidPk =
              (body &&
                JSON.stringify(body).toLowerCase().includes("invalid pk")) ||
              text.includes("invalid pk") ||
              text.includes("object does not exist");
            const mentionsWorkout =
              (body &&
                JSON.stringify(body).toLowerCase().includes("workout")) ||
              (text.includes("workout") && text.includes("does not exist"));
            const mentionsExercise =
              (body &&
                JSON.stringify(body).toLowerCase().includes("exercise")) ||
              (text.includes("exercise") && text.includes("does not exist"));

            if (mentionsInvalidPk || mentionsWorkout || mentionsExercise) {
              if (mentionsExercise) {
                const created = await createExercise(
                  ex.exercise.name,
                  (ex.exercise as any).muscleGroup || "calves",
                  ""
                );
                exId = created.id;
              }

              if (mentionsWorkout || mentionsInvalidPk) {
                // backend lost the workout; try to recreate and update the local id
                const createdWorkout = await createWorkout(workoutName);
                curWorkoutId = createdWorkout.id;
              }

              // retry once
              let createdRetry: any;
              if (ex.exercise.muscleGroup === "cardio") {
                const mode = s.cardioMode || "treadmill";
                const durationSeconds = s.cardioDurationSeconds ?? 0;
                const rawDistance = s.cardioDistance ?? 0;
                const rawStat = s.cardioStat ?? 0;
                const distanceUnit =
                  (s as any).cardioDistanceUnit === "mile" ? "mile" : "km";

                let distance: number | undefined;
                let floors: number | undefined;
                let level: number | undefined;
                let splitSeconds: number | undefined;

                if (mode === "stairs") {
                  floors = rawDistance || undefined;
                  level = rawStat || undefined;
                } else {
                  const distanceMeters =
                    rawDistance && distanceUnit === "mile"
                      ? Math.round(rawDistance * 1609.34)
                      : rawDistance
                      ? Math.round(rawDistance * 1000)
                      : undefined;
                  if (mode === "row") {
                    distance = distanceMeters || undefined;
                    splitSeconds = rawStat || undefined;
                  } else {
                    distance = distanceMeters || undefined;
                    level = rawStat || undefined;
                  }
                }

                createdRetry = await createCardioSet({
                  workoutId: curWorkoutId as string,
                  exerciseId: exId,
                  mode: mode as any,
                  durationSeconds,
                  distance,
                  floors,
                  level,
                  splitSeconds,
                });
              } else {
                createdRetry = await createSet({
                  workoutId: curWorkoutId as string,
                  exerciseId: exId,
                  setNumber: i + 1,
                  reps: s.reps || 0,
                  weight: s.weight,
                  unit: s.unit || getUnit(),
                  type: s.type,
                  rpe: s.rpe,
                });
              }
              try {
                if (
                  !allowPrForWorkout &&
                  (createdRetry.isPR ||
                    createdRetry.absWeightPR ||
                    createdRetry.e1rmPR ||
                    createdRetry.volumePR)
                ) {
                  localStorage.setItem(
                    `set:prOverride:${createdRetry.id}`,
                    "0"
                  );
                } else if (allowPrForWorkout) {
                  localStorage.removeItem(`set:prOverride:${createdRetry.id}`);
                }
              } catch (e) {}
            } else {
              throw err;
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["sets", workoutId] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });

      // Persist updated per-exercise notes locally keyed by workout and exercise name
      try {
        const notesMap: Record<string, string> = {};
        for (const ex of exercises) {
          const note = ex.notes;
          if (note && note.trim()) {
            const key = ex.exercise.name.toLowerCase();
            notesMap[key] = note.trim();
          }
        }
        const storageKey = `workout:exerciseNotes:${curWorkoutId}`;
        if (Object.keys(notesMap).length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(notesMap));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        // ignore local notes persistence errors
      }

      toast({ title: "Workout updated" });
      navigate("/workouts");
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const removeExercise = (exerciseId: string) =>
    setExercises(exercises.filter((ex) => ex.id !== exerciseId));
  const removeSet = (exerciseId: string, setId: string) =>
    setExercises(
      exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex
      )
    );

  return (
    <AppLayout>
      <div className="pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2 flex justify-center w-full px-4">
        <div
          className={`pointer-events-auto flex items-center gap-3 rounded-full bg-muted px-4 py-2 shadow-lg border border-border max-w-xs sm:max-w-md transition-all duration-300 ease-out transform ${
            prVisible && prBanner
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-2 scale-95"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/90 text-black">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {prBanner?.exerciseName}
            </span>
            <span className="text-sm font-semibold text-white truncate">
              {prBanner ? `${prBanner.label} - ${prBanner.value}` : ""}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Input
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="border-none bg-transparent p-0 font-heading text-3xl font-bold focus-visible:ring-0"
            />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <button
                type="button"
                className="flex items-center gap-1 underline-offset-4 hover:underline"
                onClick={() => setIsDurationDialogOpen(true)}
              >
                <Clock className="h-4 w-4" />
                {formatMinutes(
                  durationMinutes !== null &&
                    typeof durationMinutes === "number"
                    ? durationMinutes
                    : getDuration()
                )}
              </button>
              <span>{exercises.length} exercises</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/workouts")}
              className="text-white"
            >
              Cancel
            </Button>
            <Button onClick={saveEditedWorkout}>
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {exercises.map((workoutExercise) => (
            <Card key={workoutExercise.id}>
              <CardContent className="px-1 py-4 sm:p-4 overflow-hidden">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-lg font-semibold">
                          {workoutExercise.exercise.name}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setReplaceTarget(workoutExercise.id);
                            setReplaceFilter(null);
                            setExerciseSearch("");
                            setFilterMuscle("all");
                            setIsExerciseDialogOpen(true);
                          }}
                          className="text-muted-foreground"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        muscleGroupColors[workoutExercise.exercise.muscleGroup]
                      }
                    >
                      {workoutExercise.exercise.muscleGroup === "other"
                        ? "calves"
                        : workoutExercise.exercise.muscleGroup}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExercise(workoutExercise.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Exercise notes (moved just under exercise header) */}
                <div className="mt-2">
                  <textarea
                    placeholder="Enter notes"
                    value={workoutExercise.notes || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setExercises((prev) =>
                        prev.map((ex) =>
                          ex.id === workoutExercise.id
                            ? { ...ex, notes: value }
                            : ex
                        )
                      );
                    }}
                    className="w-full rounded-md border border-border bg-neutral-900/60 px-3 py-1 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                    rows={1}
                  />
                </div>

                {workoutExercise.exercise.muscleGroup === "cardio" ? (
                  <div
                    className="mt-3 mb-1.5 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                    style={{ gridTemplateColumns: GRID_TEMPLATE_CARDIO }}
                  >
                    <span className="flex items-center justify-center">
                      SET
                    </span>
                    <span className="flex items-center justify-center">
                      DURATION
                    </span>
                    <span className="flex items-center justify-center">
                      DISTANCE
                    </span>
                    <span className="flex items-center justify-center">
                      LEVEL
                    </span>
                    <span className="flex items-center justify-center">
                      <Trophy className="h-3.5 w-3.5" />
                    </span>
                    <div />
                  </div>
                ) : (
                  <div
                    className="mt-3 mb-1.5 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                    style={{ gridTemplateColumns: GRID_TEMPLATE }}
                  >
                    <span className="flex items-center justify-center">
                      SET
                    </span>
                    <span className="flex items-center justify-center">
                      WEIGHT
                    </span>
                    <div />
                    <span className="flex items-center justify-center">
                      REPS
                    </span>
                    <span className="flex items-center justify-center">
                      RPE
                    </span>
                    <span className="flex items-center justify-center">
                      <Trophy className="h-3.5 w-3.5" />
                    </span>
                    <div />
                  </div>
                )}

                <div className="space-y-2">
                  {workoutExercise.sets.map((set, index) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      exerciseName={workoutExercise.exercise.name}
                      unit={set.unit || getUnit()}
                      setNumber={index + 1}
                      onUpdate={(updates) =>
                        updateSetLocal(workoutExercise.id, set.id, updates)
                      }
                      onUnitChange={(u) =>
                        updateSetLocal(workoutExercise.id, set.id, { unit: u })
                      }
                      onComplete={() =>
                        handleSetComplete(workoutExercise.id, set.id)
                      }
                    />
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSet(workoutExercise.id)}
                    className="flex-1"
                  >
                    {" "}
                    <Plus className="h-4 w-4" /> Add Set
                  </Button>
                  {workoutExercise.sets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        removeSet(
                          workoutExercise.id,
                          workoutExercise.sets[workoutExercise.sets.length - 1]
                            .id
                        )
                      }
                      className="text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full border-dashed text-white"
          onClick={() => {
            setReplaceTarget(null);
            setExerciseSearch("");
            setFilterMuscle("all");
            setIsExerciseDialogOpen(true);
          }}
        >
          {" "}
          <Plus className="h-4 w-4" /> Add Exercise
        </Button>

        <Dialog
          open={isExerciseDialogOpen}
          onOpenChange={(open) => {
            setIsExerciseDialogOpen(open);
            if (!open) {
              setExerciseSearch("");
              setReplaceTarget(null);
              setReplaceFilter(null);
              setFilterMuscle("all");
            }
          }}
        >
          <DialogContent className="max-h-[85vh] flex flex-col bg-[#0f0f0f] border border-neutral-800/40 text-white">
            <DialogHeader>
              <DialogTitle>
                {replaceTarget ? "Replace Exercise" : "Add Exercise"}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {replaceTarget
                  ? "Select an exercise to replace the current exercise."
                  : "Select an exercise from your library."}
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-10 bg-muted/20 border border-neutral-800/30 focus:ring-primary"
              />
            </div>

            <div className="pt-3">
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                <button
                  onClick={() => setFilterMuscle("all")}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    filterMuscle === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  All Muscles
                </button>
                {availableMuscleGroups.map((m) => {
                  const colorClass =
                    muscleGroupColors[m as keyof typeof muscleGroupColors] ||
                    "bg-muted/20 text-muted-foreground";
                  const active = filterMuscle === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setFilterMuscle(m)}
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-all ${colorClass} ${
                        active
                          ? "ring-2 ring-offset-2 ring-[#0f0f0f] font-bold"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
              {filteredExercises.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No exercises found matching "{exerciseSearch}"
                </p>
              ) : (
                filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() =>
                      replaceTarget
                        ? replaceExercise(replaceTarget, exercise)
                        : addExercise(exercise)
                    }
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-secondary/50 group"
                  >
                    <div className="flex-1">
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {exercise.name}
                      </p>
                      <Badge
                        variant="secondary"
                        className={muscleGroupColors[exercise.muscleGroup]}
                      >
                        {exercise.muscleGroup === "other"
                          ? "calves"
                          : exercise.muscleGroup}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit duration dialog */}
        <Dialog
          open={isDurationDialogOpen}
          onOpenChange={setIsDurationDialogOpen}
        >
          <DialogContent className="max-w-[360px] rounded-[28px] bg-neutral-950 border border-neutral-800/40 text-white pb-4 pt-2">
            {/* Drag handle */}
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-800" />
            <DialogHeader className="items-center text-center pb-1">
              <DialogTitle className="font-heading text-base font-semibold tracking-tight">
                Duration
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-1">
              {/* Duration summary row (tap to expand picker) */}
              <button
                type="button"
                onClick={() => setShowDurationPicker((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl bg-neutral-900/60 px-3 py-2 text-left"
              >
                <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                  Duration
                </span>
                <span className="text-sm font-semibold text-white">
                  {formatMinutes(
                    durationMinutes !== null &&
                      typeof durationMinutes === "number"
                      ? durationMinutes
                      : getDuration()
                  )}
                </span>
              </button>

              {/* Wheel-style duration inputs (shown on tap) */}
              {showDurationPicker && (
                <div className="space-y-2">
                  <div className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                    Target Duration
                  </div>
                  <div className="relative overflow-hidden rounded-2xl bg-muted/10">
                    <div className="relative flex items-center justify-center gap-10 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                          Hours
                        </span>
                        <div className="relative h-32 w-16 overflow-y-auto py-1 scrollbar-hide">
                          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setEditDurationHours(h)}
                              className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                                h === editDurationHours
                                  ? "font-semibold text-white bg-neutral-800/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                          Hr
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                          Min
                        </span>
                        <div className="relative h-32 w-16 overflow-y-auto py-1 scrollbar-hide">
                          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setEditDurationMinutes(m)}
                              className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                                m === editDurationMinutes
                                  ? "font-semibold text-white bg-neutral-800/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                          Min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Start time (with scrollable date selector, mirroring NewWorkout) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowStartPicker((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl bg-neutral-900/60 px-3 py-2 text-left"
                >
                  <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                    Start time
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {startTime.toLocaleString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
                {showStartPicker && (
                  <div className="relative mt-2 overflow-hidden rounded-2xl bg-white/[0.02]">
                    <div className="relative max-h-40 overflow-y-auto py-2 scrollbar-hide">
                      {Array.from({ length: 5 }, (_, idx) => {
                        const offset = idx - 2;
                        const d = new Date(startTime);
                        d.setDate(d.getDate() + offset);
                        return d;
                      }).map((date) => (
                        <button
                          key={date.toISOString()}
                          type="button"
                          onClick={() => setStartDateOnly(date)}
                          className={`flex h-9 w-full items-center justify-center px-3 text-sm transition-colors rounded-md ${
                            isSameDay(date, startTime)
                              ? "font-semibold text-white bg-neutral-800/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatDateLabel(date)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  className="flex-1 text-xs font-medium text-muted-foreground hover:text-white"
                  onClick={() => setIsDurationDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-xs font-semibold"
                  onClick={() => {
                    const total = editDurationHours * 60 + editDurationMinutes;
                    const clamped = Math.max(1, total);
                    setDurationMinutes(clamped);
                    if (workoutId) {
                      try {
                        localStorage.setItem(
                          `workout:durationOverride:${workoutId}`,
                          String(clamped)
                        );
                      } catch (e) {}
                    }
                    setIsDurationDialogOpen(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
