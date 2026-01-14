const GRID_TEMPLATE =
  "minmax(20px, 0.4fr) minmax(65px, 0.8fr) 6px minmax(25px, 0.4fr) minmax(30px, 0.4fr) 32px 30px";

// Match cardio row layout from SetRow: Set | Duration | Distance/Floors | Level/Split | PR | Check
const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.4fr) minmax(60px, 0.6fr) minmax(60px, 0.8fr) minmax(30px, 0.25fr) 32px 30px";

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Save,
  Trash2,
  Clock,
  ChevronRight,
  ChevronDown,
  Trophy,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { SetRow } from "@/components/workout/SetRow";
import { getUnit, setUnit } from "@/lib/utils";
import type {
  WorkoutExercise,
  WorkoutSet,
  Exercise,
  Routine,
  CardioMode,
} from "@/types/workout";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { muscleGroupColors } from "@/data/mockData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createWorkout,
  createSet,
  updateSet,
  createCardioSet,
  updateCardioSet,
  finishWorkout,
  getExercises,
  getSetsForExercise,
  getWorkouts,
  createExercise,
  getToken,
} from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import { libraryExercises as staticLibraryExercises } from "@/data/libraryExercises";

export default function NewWorkout() {
  
  const getCardioModeForExercise = (exercise: Exercise): CardioMode => {
  const name = exercise.name.toLowerCase();
  if (name.includes("treadmill")) return "treadmill";
  if (name.includes("bike") || name.includes("cycle")) return "bike";
  if (name.includes("elliptical")) return "elliptical";
  if (name.includes("stair") || name.includes("step")) return "stairs";
  if (name.includes("row")) return "row";
  return "treadmill";
};

  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { routine?: Routine; fromNewRoutine?: boolean; forceNew?: boolean };
  };
  const fromRoutine = location.state?.routine;
  const isNewRoutineTemplate = !!location.state?.fromNewRoutine;
  const isRoutineBuilder = !!fromRoutine && isNewRoutineTemplate;
  const startedFromRoutine = !!fromRoutine && !isNewRoutineTemplate;
  const forceNew = !!location.state?.forceNew;
  const { toast } = useToast();
  const [workoutName, setWorkoutName] = useState(
    fromRoutine?.name || "New Workout"
  );
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() => {
    if (!fromRoutine) return [];
    return fromRoutine.exercises
      .sort((a, b) => a.order - b.order)
      .map((re) => ({
        id: crypto.randomUUID(),
        exercise: re.exercise,
        notes: "",
        sets: Array.from({ length: re.targetSets }).map(() => {
          const isCardio = re.exercise.muscleGroup === "cardio";
          return {
            id: crypto.randomUUID(),
            reps: 0,
            weight: 0,
            unit: getUnit(),
            isPR: false,
            completed: false,
            type: "S" as const,
            rpe: undefined,
            cardioMode: isCardio
              ? getCardioModeForExercise(re.exercise)
              : undefined,
            cardioDistanceUnit: isCardio ? "km" : undefined,
            cardioDurationSeconds: isCardio ? 0 : undefined,
            cardioDistance: isCardio ? 0 : undefined,
            cardioStat: isCardio ? 0 : undefined,
          };
        }),
      }));
  });
  type PrBanner = {
    exerciseName: string;
    label: string;
    value: string;
  };
  const [prBanner, setPrBanner] = useState<PrBanner | null>(null);
  const [prQueue, setPrQueue] = useState<PrBanner[]>([]);
  const [prVisible, setPrVisible] = useState(false);
  type UnusualSetState = {
    exerciseId: string;
    setId: string;
    previousBestText: string;
    newSetText: string;
  };
  const [unusualSet, setUnusualSet] = useState<UnusualSetState | null>(null);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exerciseToReplace, setExerciseToReplace] = useState<string | null>(
    null
  );
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [startTime, setStartTime] = useState<Date>(() => new Date());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
  const [adjustHours, setAdjustHours] = useState(0);
  const [adjustMinutes, setAdjustMinutes] = useState(0);
  const [startTimeInput, setStartTimeInput] = useState("");
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [paused, setPaused] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("workout:paused");
    } catch (e) {
      return false;
    }
  });

  // If we navigated here by starting a routine, start the workout paused
  useEffect(() => {
    if (!startedFromRoutine) return;
    try {
      // Start routine sessions unpaused so the timer begins immediately
      localStorage.removeItem("workout:paused");
    } catch (e) {}
    setPaused(false);
  }, [startedFromRoutine]);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const hasToken = typeof window !== "undefined" && !!getToken();

  const { data: userExercises = [] } = useQuery({
    queryKey: ["exercises", hasToken],
    queryFn: getExercises,
    enabled: hasToken,
  });

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
    const timer = setTimeout(() => {
      setPrVisible(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [prVisible]);

  useEffect(() => {
    if (prVisible || !prBanner) return;
    const timer = setTimeout(() => {
      setPrBanner(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [prVisible, prBanner]);

  const allExercises = useMemo(() => {
    const map = new Map<string, Exercise>();
    const normalize = (e: Exercise): Exercise => ({
      ...e,
      muscleGroup: e.muscleGroup === "other" ? "calves" : e.muscleGroup,
    });
    staticLibraryExercises.forEach((e) =>
      map.set(e.name.toLowerCase(), normalize(e))
    );
    userExercises.forEach((e) => map.set(e.name.toLowerCase(), normalize(e)));
    return Array.from(map.values());
  }, [userExercises]);

  const createWorkoutMutation = useMutation({
    mutationFn: (name: string) => createWorkout(name),
    onSuccess: (w) => {
      setWorkoutId(w.id);
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      try {
        triggerHaptic();
      } catch (e) {}
    },
    onError: (err: any) => {
      toast({
        title: "Failed to start workout",
        description: String(err),
        variant: "destructive",
      });
    },
  });

  // Allow unauthenticated users to start a local workout; only require auth for server actions.

  useEffect(() => {
    if (!hasToken || isRoutineBuilder) return;

    if (forceNew) {
      try {
        const inProg = localStorage.getItem("workout:inProgress");
        if (inProg) {
          const obj = JSON.parse(inProg);
          if (obj && obj.id) {
            localStorage.removeItem(`workout:state:${obj.id}`);
          }
        }
        localStorage.removeItem("workout:inProgress");
        localStorage.removeItem("workout:paused");
      } catch (e) {}

      if (!workoutId) {
        createWorkoutMutation.mutate(workoutName);
      }
      return;
    }

    try {
      const inProg = localStorage.getItem("workout:inProgress");
      if (inProg) {
        const obj = JSON.parse(inProg);
        if (obj && obj.id) {
          setWorkoutId(obj.id);
          const saved = localStorage.getItem(`workout:state:${obj.id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.exercises) setExercises(parsed.exercises);
            if (typeof parsed.elapsedSec === "number")
              setElapsedSec(parsed.elapsedSec);
            if (parsed.startTime) {
              const dt = new Date(parsed.startTime);
              if (!isNaN(dt.getTime())) setStartTime(dt);
            }
          }
          try {
            // Keep restored workouts paused when the app is restarted or reopened
            // so the user returns to the same state they left (require explicit resume).
            try {
              localStorage.setItem("workout:paused", "1");
            } catch (e) {}
            setPaused(true);
          } catch (e) {}
          return;
        }
      }
    } catch (e) {}

    if (!workoutId) {
      createWorkoutMutation.mutate(workoutName);
    }
  }, [workoutName, hasToken, isRoutineBuilder]);

  useEffect(() => {
    if (!workoutId || isRoutineBuilder) return;
    try {
      localStorage.setItem(
        `workout:state:${workoutId}`,
        JSON.stringify({ exercises, elapsedSec, workoutName, notes, startTime })
      );
    } catch (e) {}
  }, [exercises, elapsedSec, workoutId, workoutName, notes, isRoutineBuilder]);

  useEffect(() => {
    if (isRoutineBuilder) return;
    const onVisibility = () => {
      if (document.hidden) {
        try {
          if (workoutId) {
            localStorage.setItem("workout:paused", "1");
          }
        } catch (e) {}
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [workoutId, isRoutineBuilder]);

  useEffect(() => {
    if (isRoutineBuilder) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "workout:paused") {
        setPaused(!!localStorage.getItem("workout:paused"));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isRoutineBuilder]);

  useEffect(() => {
    if (!workoutId || isRoutineBuilder) return;
    if (paused) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [workoutId, paused, isRoutineBuilder]);

  // Sync dialog controls with current elapsed time when opened
  useEffect(() => {
    if (!isDurationDialogOpen) return;
    const total = elapsedSec;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    setAdjustHours(h);
    setAdjustMinutes(m);
    // Initialize start time input from current startTime
    const dt = startTime;
    const pad = (n: number) => String(n).padStart(2, "0");
    const value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate()
    )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setStartTimeInput(value);
    setShowDurationPicker(false);
    setShowStartPicker(false);
  }, [isDurationDialogOpen]);

  useEffect(() => {
    if (workoutId && !isRoutineBuilder) {
      try {
        localStorage.setItem(
          "workout:inProgress",
          JSON.stringify({
            id: workoutId,
            startedAt: new Date().toISOString(),
            routineId: fromRoutine?.id ?? null,
          })
        );
        // If this session was started from a routine, keep it paused; otherwise clear paused flag
        if (!startedFromRoutine) {
          localStorage.removeItem("workout:paused");
        }
      } catch (e) {}
    }
  }, [workoutId, isRoutineBuilder]);

  const [filterMuscle, setFilterMuscle] = useState<"all" | string>("all");

  const availableMuscles = useMemo(() => {
    const set = new Set<string>();
    allExercises.forEach((e) => set.add(e.muscleGroup));
    return Array.from(set);
  }, [allExercises]);

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

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${mins}min`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  };

  const getDuration = () => formatDuration(elapsedSec);

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
    const dt = new Date(startTime);
    dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setStartTime(dt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate()
    )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setStartTimeInput(value);
  };

  const startTimeDisplay = startTime.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const startDateOptions: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = -2; offset <= 2; offset += 1) {
    const d = new Date(startTime);
    d.setDate(d.getDate() + offset);
    // Do not allow future dates beyond today
    const candidate = new Date(d);
    candidate.setHours(0, 0, 0, 0);
    if (candidate.getTime() > today.getTime()) continue;
    startDateOptions.push(d);
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const addExercise = (exercise: Exercise) => {
    const isCardio = exercise.muscleGroup === "cardio";
    const cardioMode = isCardio
      ? getCardioModeForExercise(exercise)
      : undefined;
    const newExercise: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise,
      notes: "",
      sets: [
        {
          id: crypto.randomUUID(),
          reps: 0,
          weight: 0,
          unit: getUnit(),
          isPR: false,
          completed: false,
          type: "S",
          rpe: undefined,
          cardioMode,
          cardioDistanceUnit: isCardio ? "km" : undefined,
          cardioDurationSeconds: isCardio ? 0 : undefined,
          cardioDistance: isCardio ? 0 : undefined,
          cardioStat: isCardio ? 0 : undefined,
        },
      ],
    };
    setExercises((prev) => [...prev, newExercise]);
    setIsExerciseDialogOpen(false);
  };

  const replaceExerciseForCard = (
    workoutExerciseId: string,
    newExercise: Exercise
  ) => {
    const isCardio = newExercise.muscleGroup === "cardio";
    const cardioMode = isCardio
      ? getCardioModeForExercise(newExercise)
      : undefined;
    setExercises((prev) =>
      prev.map((we) => {
        if (we.id !== workoutExerciseId) return we;
        // Keep the same number of sets but reset them so the user
        // re-enters weight/reps for the new exercise.
        const resetSets: WorkoutSet[] = we.sets.map(() => ({
  id: crypto.randomUUID(),
  reps: 0,
  weight: 0,
  unit: getUnit(),
  isPR: false,
  completed: false,
  type: "S" as const,
  rpe: undefined,
  cardioMode,
  cardioDistanceUnit: isCardio ? "km" : undefined,
  cardioDurationSeconds: isCardio ? 0 : undefined,
  cardioDistance: isCardio ? 0 : undefined,
  cardioStat: isCardio ? 0 : undefined,
}));

        return {
          ...we,
          exercise: newExercise,
          sets: resetSets,
        };
      })
    );
    setExerciseToReplace(null);
    setIsExerciseDialogOpen(false);
  };

  const addSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: crypto.randomUUID(),
                reps: lastSet?.reps || 0,
                weight: lastSet?.weight || 0,
                unit: lastSet?.unit || getUnit(),
                isPR: false,
                completed: false,
                type: (lastSet as any)?.type || "S",
                rpe:
                  typeof (lastSet as any)?.rpe === "number"
                    ? (lastSet as any).rpe
                    : undefined,

                cardioMode:
                  ex.exercise.muscleGroup === "cardio"
                    ? (lastSet as any)?.cardioMode ??
                      getCardioModeForExercise(ex.exercise)
                    : undefined,

                cardioDistanceUnit:
                  ex.exercise.muscleGroup === "cardio"
                    ? (lastSet as any)?.cardioDistanceUnit ?? "km"
                    : undefined,

                cardioDurationSeconds:
                  ex.exercise.muscleGroup === "cardio"
                    ? (lastSet as any)?.cardioDurationSeconds ?? 0
                    : undefined,

                cardioDistance:
                  ex.exercise.muscleGroup === "cardio"
                    ? (lastSet as any)?.cardioDistance ?? 0
                    : undefined,

                cardioStat:
                  ex.exercise.muscleGroup === "cardio"
                    ? (lastSet as any)?.cardioStat ?? 0
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
    setExercises((prev) =>
      prev.map((ex) => {
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

  const toggleSetComplete = async (
    exerciseId: string,
    setId: string,
    force = false
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.id === setId ? { ...set, completed: !set.completed } : set
            ),
          };
        }
        return ex;
      })
    );

    if (isRoutineBuilder) return;

    const ex = exercises.find((e) => e.id === exerciseId);
    const set = ex?.sets.find((s) => s.id === setId);
    if (!ex || !set) return;

    const nowCompleted = !set.completed;
    if (!nowCompleted) return;

    try {
      let wId = workoutId;
      if (!wId) {
        const w = await createWorkout(workoutName);
        setWorkoutId(w.id);
        wId = w.id;
      }

      let backendExerciseId = String(ex.exercise.id);
      if (!/^[0-9]+$/.test(backendExerciseId)) {
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .replace(/\([^)]*\)/g, " ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const targetNorm = normalize(ex.exercise.name);
        const match = userExercises.find(
          (ue) => normalize(ue.name) === targetNorm
        );

        if (match) {
          backendExerciseId = String(match.id);
          setExercises((prev) =>
            prev.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    exercise: { ...e.exercise, id: match.id as any },
                  }
                : e
            )
          );
        } else {
          const created = await createExercise(
            ex.exercise.name,
            ex.exercise.muscleGroup as any,
            (ex.exercise as any).description || ""
          );
          backendExerciseId = String(created.id);
          setExercises((prev) =>
            prev.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    exercise: { ...e.exercise, id: created.id },
                  }
                : e
            )
          );
        }
      }

      const isPersisted = /^\d+$/.test(String(set.id));
      const payload = {
        reps: set.reps,
        weight: set.weight,
        unit: set.unit || getUnit(),
        type: set.type,
        rpe: set.rpe,
      } as const;

      // Check whether user has prior completed workouts for this exercise
      // and compute their strongest historical sets for "unusual" detection.
      let hadPrior = false;
      let best1rmKg = 0;
      let bestVolumeKg = 0;
      // map of rounded kg -> max reps at that weight (for local rep-PR detection)
      const priorRepsAtWeight: Record<number, number> = {};
      try {
        const priorSets = await getSetsForExercise(backendExerciseId);
        let completedSets = priorSets;
        try {
          const allWorkouts = await getWorkouts();
          const finished = new Set(
            allWorkouts.filter((w) => !!w.endedAt).map((w) => String(w.id))
          );
          completedSets = priorSets.filter((ps) =>
            finished.has(String(ps.workout))
          );
        } catch (e) {
          // If we can't fetch workouts, fall back to any prior set existing
          completedSets = priorSets;
        }

        hadPrior = completedSets.length > 0;

        const LBS_PER_KG = 2.20462;
        for (const ps of completedSets) {
          const w = typeof ps.weight === "number" ? ps.weight : 0;
          const r = ps.reps;
          if (!(w > 0 && r > 0)) continue;
          const kg =
            (ps.unit as "lbs" | "kg" | undefined) === "kg" ? w : w / LBS_PER_KG;
          const vol = kg * r;
          if (vol > bestVolumeKg) bestVolumeKg = vol;
          if (r > 0 && r < 37) {
            const est = (kg * 36) / (37 - r);
            if (est > best1rmKg) best1rmKg = est;
          }
          // record max reps at this rounded kg
          try {
            const key = Math.round(kg * 100) / 100; // round to 2 decimals
            const prev = priorRepsAtWeight[key];
            if (prev == null || r > prev) priorRepsAtWeight[key] = r;
          } catch (e) {}
        }
      } catch (e) {
        hadPrior = false;
      }

      // If this set is wildly above the user's previous best for this
      // exercise, ask them to confirm before logging it.
      if (hadPrior && !force) {
        const LBS_PER_KG = 2.20462;
        const newWeight =
          typeof set.weight === "number" && !isNaN(set.weight) ? set.weight : 0;
        const newReps =
          typeof set.reps === "number" && !isNaN(set.reps) ? set.reps : 0;

        const newUnit = (payload.unit as "lbs" | "kg" | undefined) || getUnit();
        const newKg = newUnit === "kg" ? newWeight : newWeight / LBS_PER_KG;
        const newVolumeKg = newKg > 0 && newReps > 0 ? newKg * newReps : 0;
        const new1rmKg =
          newKg > 0 && newReps > 0 && newReps < 37
            ? (newKg * 36) / (37 - newReps)
            : 0;

        const ratio1rm =
          best1rmKg > 0 && new1rmKg > 0 ? new1rmKg / best1rmKg : 1;
        const ratioVol =
          bestVolumeKg > 0 && newVolumeKg > 0 ? newVolumeKg / bestVolumeKg : 1;
        const ratio = Math.max(ratio1rm, ratioVol);

        const UNUSUAL_THRESHOLD = 3; // 3x or more vs previous best

        if (ratio >= UNUSUAL_THRESHOLD) {
          // Revert the optimistic completion toggle so the user stays in edit mode.
          setExercises((prev) =>
            prev.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    sets: e.sets.map((s) =>
                      s.id === setId ? { ...s, completed: false } : s
                    ),
                  }
                : e
            )
          );

          const prevSummary =
            bestVolumeKg > 0
              ? `${bestVolumeKg.toFixed(1)} kg volume (approx.)`
              : best1rmKg > 0
              ? `${best1rmKg.toFixed(1)} kg est. 1RM`
              : "Previous best unknown";

          const newSummary =
            newKg > 0 && newReps > 0
              ? `${newKg.toFixed(1)} kg x ${newReps} reps`
              : "Current entry has no load/reps";

          setUnusualSet({
            exerciseId,
            setId,
            previousBestText: prevSummary,
            newSetText: newSummary,
          });
          return;
        }
      }

      let saved;
      try {
        saved = isPersisted
          ? await updateSet(String(set.id), payload)
          : await createSet({
              workoutId: String(wId),
              exerciseId: backendExerciseId,
              ...payload,
            });
      } catch (err: any) {
        const text = String(err || "").toLowerCase();
        const mentionsInvalidPk =
          text.includes("invalid pk") || text.includes("object does not exist");
        const mentionsWorkout =
          text.includes("workout") && text.includes("does not exist");
        const mentionsExercise =
          text.includes("exercise") && text.includes("does not exist");

        if (mentionsInvalidPk || mentionsWorkout || mentionsExercise) {
          if (mentionsExercise) {
            try {
              const createdEx = await createExercise(
                ex.exercise.name,
                ex.exercise.muscleGroup as any,
                (ex.exercise as any).description || ""
              );
              backendExerciseId = String(createdEx.id);
              setExercises((prev) =>
                prev.map((e) =>
                  e.id === exerciseId
                    ? { ...e, exercise: { ...e.exercise, id: createdEx.id } }
                    : e
                )
              );
            } catch (createExErr) {
              throw err;
            }
          }

          if (mentionsWorkout || mentionsInvalidPk) {
            const w = await createWorkout(workoutName);
            setWorkoutId(w.id);
            wId = w.id;
          }

          // retry once
          saved = await createSet({
            workoutId: String(wId),
            exerciseId: backendExerciseId,
            ...payload,
          });
        } else {
          throw err;
        }
      }

      setExercises((prev) =>
        prev.map((e) =>
          e.id !== exerciseId
            ? e
            : {
                ...e,
                sets: e.sets.map((s) =>
                  s.id === setId
                    ? (() => {
                        // local rep-PR detection: compare rounded kg against prior map
                        let localRepPR = false;
                        try {
                          const newWeight =
                            typeof saved.weight === "number" ? saved.weight : 0;
                          const newReps =
                            typeof saved.reps === "number" ? saved.reps : 0;
                          const newKg =
                            (saved.unit === "kg"
                              ? newWeight
                              : newWeight / 2.20462) || 0;
                          const key = Math.round(newKg * 100) / 100;
                          const hist = priorRepsAtWeight[key];
                          if (hadPrior) {
                            // server logic treats missing exact-weight history as a rep-PR
                            if (typeof hist === "undefined" || newReps > hist)
                              localRepPR = true;
                          }
                        } catch (e) {}

                        const isPRFlag = hadPrior
                          ? saved.isPR || localRepPR
                          : false;
                        return {
                          ...s,
                          id: saved.id,
                          isPR: isPRFlag,
                          absWeightPR: hadPrior ? saved.absWeightPR : false,
                          e1rmPR: hadPrior ? saved.e1rmPR : false,
                          volumePR: hadPrior ? saved.volumePR : false,
                          unit: saved.unit || s.unit,
                        };
                      })()
                    : s
                ),
              }
        )
      );

      // If server reported a PR, or our local detection found one, enqueue banners
      let localDetectedPR = false;
      try {
        const newWeight = typeof saved.weight === "number" ? saved.weight : 0;
        const newReps = typeof saved.reps === "number" ? saved.reps : 0;
        const newKg =
          (saved.unit === "kg" ? newWeight : newWeight / 2.20462) || 0;
        const key = Math.round(newKg * 100) / 100;
        const hist = priorRepsAtWeight[key];
        if (hadPrior) {
          if (typeof hist === "undefined" || newReps > hist)
            localDetectedPR = true;
        }
      } catch (e) {}

      if (hadPrior && (saved.isPR || localDetectedPR)) {
        const unit = (saved.unit as "lbs" | "kg" | undefined) || getUnit();
        const weight = typeof saved.weight === "number" ? saved.weight : 0;
        const reps = saved.reps;

        const banners: PrBanner[] = [];

        if (saved.absWeightPR && weight > 0) {
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Heaviest Weight",
            value: `${weight.toFixed(1)} ${unit}`,
          });
        }

        if (saved.e1rmPR && weight > 0 && reps > 0 && reps < 37) {
          const est1rm = (weight * 36) / (37 - reps);
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Best 1RM",
            value: `${est1rm.toFixed(1)} ${unit}`,
          });
        }

        if (saved.volumePR && weight > 0 && reps > 0) {
          const LBS_PER_KG = 2.20462;
          const volumeKg =
            unit === "kg" ? weight * reps : (weight / LBS_PER_KG) * reps;
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Best Set Volume",
            value: `${volumeKg.toFixed(1)} kg`,
          });
        }

        if (banners.length > 0) {
          setPrQueue((prev) => [...prev, ...banners]);
        }
      }
    } catch (err) {
      toast({
        title: "Failed to log set",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const toggleCardioSetComplete = async (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.id === setId ? { ...set, completed: !set.completed } : set
            ),
          };
        }
        return ex;
      })
    );

    if (isRoutineBuilder) return;

    const ex = exercises.find((e) => e.id === exerciseId);
    const set = ex?.sets.find((s) => s.id === setId);
    if (!ex || !set) return;

    const nowCompleted = !set.completed;
    if (!nowCompleted) return;

    if (ex.exercise.muscleGroup !== "cardio") {
      await toggleSetComplete(exerciseId, setId);
      return;
    }

    try {
      let wId = workoutId;
      if (!wId) {
        const w = await createWorkout(workoutName);
        setWorkoutId(w.id);
        wId = w.id;
      }

      let backendExerciseId = String(ex.exercise.id);
      if (!/^[0-9]+$/.test(backendExerciseId)) {
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .replace(/\([^)]*\)/g, " ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const targetNorm = normalize(ex.exercise.name);
        const match = userExercises.find(
          (ue) => normalize(ue.name) === targetNorm
        );

        if (match) {
          backendExerciseId = String(match.id);
          setExercises((prev) =>
            prev.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    exercise: { ...e.exercise, id: match.id as any },
                  }
                : e
            )
          );
        } else {
          const created = await createExercise(
            ex.exercise.name,
            ex.exercise.muscleGroup as any,
            (ex.exercise as any).description || ""
          );
          backendExerciseId = String(created.id);
          setExercises((prev) =>
            prev.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    exercise: { ...e.exercise, id: created.id },
                  }
                : e
            )
          );
        }
      }

      const mode =
        set.cardioMode || getCardioModeForExercise(ex.exercise) || "treadmill";

      const isPersisted = /^\d+$/.test(String(set.id));

      const durationSeconds = set.cardioDurationSeconds ?? 0;
      const rawDistance = set.cardioDistance ?? 0;
      const rawStat = set.cardioStat ?? 0;
      const distanceUnit =
        (set as any).cardioDistanceUnit === "mile" ? "mile" : "km";

      // Map generic UI stats to backend metrics per mode
      let distance: number | undefined;
      let floors: number | undefined;
      let level: number | undefined;
      let splitSeconds: number | undefined;

      if (mode === "stairs") {
        floors = rawDistance || undefined;
        level = rawStat || undefined;
      } else {
        // Convert user-entered distance (km or miles) into meters for the API.
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

      let saved;
      try {
        saved = isPersisted
          ? await updateCardioSet(String(set.id), {
              mode,
              durationSeconds,
              distance,
              floors,
              level,
              splitSeconds,
            })
          : await createCardioSet({
              workoutId: String(wId),
              exerciseId: backendExerciseId,
              mode,
              durationSeconds,
              distance,
              floors,
              level,
              splitSeconds,
            });
      } catch (err: any) {
        const text = String(err || "").toLowerCase();
        const mentionsInvalidPk =
          text.includes("invalid pk") || text.includes("object does not exist");
        const mentionsWorkout =
          text.includes("workout") && text.includes("does not exist");
        const mentionsExercise =
          text.includes("exercise") && text.includes("does not exist");

        if (mentionsInvalidPk || mentionsWorkout || mentionsExercise) {
          if (mentionsExercise) {
            try {
              const createdEx = await createExercise(
                ex.exercise.name,
                ex.exercise.muscleGroup as any,
                (ex.exercise as any).description || ""
              );
              backendExerciseId = String(createdEx.id);
              setExercises((prev) =>
                prev.map((e) =>
                  e.id === exerciseId
                    ? {
                        ...e,
                        exercise: { ...e.exercise, id: createdEx.id },
                      }
                    : e
                )
              );
            } catch (createExErr) {
              throw err;
            }
          }

          if (mentionsWorkout || mentionsInvalidPk) {
            const w = await createWorkout(workoutName);
            setWorkoutId(w.id);
            wId = w.id;
          }

          saved = await createCardioSet({
            workoutId: String(wId),
            exerciseId: backendExerciseId,
            mode,
            durationSeconds,
            distance,
            floors,
            level,
            splitSeconds,
          });
        } else {
          throw err;
        }
      }

      setExercises((prev) =>
        prev.map((e) =>
          e.id !== exerciseId
            ? e
            : {
                ...e,
                sets: e.sets.map((s) =>
                  s.id === setId
                    ? {
                        ...s,
                        id: saved.id,
                        cardioMode: mode,
                        cardioDurationSeconds: saved.durationSeconds,
                        // Backend returns distance in meters; convert back to user-facing unit
                        cardioDistance:
                          typeof saved.distance === "number"
                            ? distanceUnit === "mile"
                              ? saved.distance / 1609.34
                              : saved.distance / 1000
                            : saved.distance,
                        cardioStat:
                          mode === "stairs"
                            ? saved.level
                            : mode === "row"
                            ? saved.splitSeconds
                            : saved.level,
                        isPR: saved.isPR,
                        cardioDistancePR: saved.distancePR,
                        cardioPacePR: saved.pacePR,
                        cardioAscentPR: saved.ascentPR,
                        cardioIntensityPR: saved.intensityPR,
                        cardioSplitPR: saved.splitPR,
                      }
                    : s
                ),
              }
        )
      );

      if (saved.isPR) {
        const banners: PrBanner[] = [];
        if (saved.distancePR) {
          // Backend returns distance in meters; convert to user-facing unit
          let disp = "";
          try {
            if (typeof saved.distance === "number") {
              if (distanceUnit === "mile") {
                disp = `${(saved.distance / 1609.34).toFixed(2)} mi`;
              } else {
                disp = `${(saved.distance / 1000).toFixed(2)} km`;
              }
            } else if (saved.distance != null) {
              disp = String(saved.distance);
            }
          } catch (e) {
            disp = saved.distance != null ? String(saved.distance) : "";
          }
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Distance PR",
            value: disp,
          });
        }
        if (saved.pacePR) {
          banners.push({
            exerciseName: ex.exercise.name,
            label: mode === "stairs" ? "Intensity PR" : "Pace PR",
            value: "",
          });
        }
        if (saved.ascentPR) {
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Ascent PR",
            value: saved.floors != null ? `${saved.floors} floors` : "",
          });
        }
        if (saved.splitPR) {
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Best Split",
            value: saved.splitSeconds != null ? `${saved.splitSeconds}s` : "",
          });
        }

        if (banners.length > 0) {
          setPrQueue((prev) => [...prev, ...banners]);
        }

        try {
          triggerHaptic();
        } catch (e) {}
      }
    } catch (err) {
      toast({
        title: "Failed to log cardio set",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const removeExercise = (exerciseId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.filter((set) => set.id !== setId),
          };
        }
        return ex;
      })
    );
  };

  const saveWorkout = async () => {
    if (exercises.length === 0) {
      toast({
        title: isRoutineBuilder ? "No exercises added" : "No exercises added",
        description: isRoutineBuilder
          ? "Add at least one exercise to save your routine."
          : "Add at least one exercise to save your workout.",
        variant: "destructive",
      });
      return;
    }

    // Pure routine builder mode: save template locally and return.
    if (isRoutineBuilder && fromRoutine) {
      try {
        const templateExercises = exercises.map((ex, index) => ({
          id: ex.id,
          exercise: ex.exercise,
          targetSets: ex.sets.length,
          targetReps: ex.sets[0]?.reps || 0,
          order: index + 1,
        }));

        const newTemplate: Routine = {
          id: fromRoutine.id,
          name: workoutName || fromRoutine.name,
          description: fromRoutine.description,
          createdAt: new Date(),
          exercises: templateExercises,
        };

        let stored: Routine[] = [];
        try {
          const raw = localStorage.getItem("user:routines");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) stored = parsed as Routine[];
          }
        } catch {
          stored = [];
        }

        const withoutOld = stored.filter((r) => r.id !== newTemplate.id);
        const updated = [...withoutOld, newTemplate];
        localStorage.setItem("user:routines", JSON.stringify(updated));

        toast({
          title: "Routine saved!",
          description: `${templateExercises.length} exercises added to routine.`,
        });
        navigate("/routines");
      } catch (e) {
        toast({
          title: "Failed to save routine",
          description: String(e),
          variant: "destructive",
        });
      }
      return;
    }

    // Ensure we have a workout on the backend before persisting sets
    if (!workoutId) {
      try {
        const w = await createWorkout(workoutName);
        setWorkoutId(w.id);
      } catch (e) {
        toast({
          title: "Failed to start workout",
          description: String(e),
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/\([^)]*\)/g, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const nonEmptyExercises = exercises.filter((ex) =>
        ex.sets.some((s) => {
          if (ex.exercise.muscleGroup === "cardio") {
            return (
              (s.cardioDurationSeconds ?? 0) > 0 ||
              (s.cardioDistance ?? 0) > 0 ||
              (s.cardioStat ?? 0) > 0
            );
          }
          return (
            (s.reps || 0) > 0 || (typeof s.weight === "number" && s.weight > 0)
          );
        })
      );

      const exercisesToPersist = await Promise.all(
        nonEmptyExercises.map(async (ex) => {
          const exIdStr = String(ex.exercise.id);
          if (/^[0-9]+$/.test(exIdStr)) return ex;

          const targetNorm = normalize(ex.exercise.name);
          const match = userExercises.find(
            (ue) => normalize(ue.name) === targetNorm
          );
          if (match) {
            return {
              ...ex,
              exercise: { ...ex.exercise, id: match.id },
            } as WorkoutExercise;
          }

          const created = await createExercise(
            ex.exercise.name,
            ex.exercise.muscleGroup as any,
            (ex.exercise as any).description || ""
          );
          return {
            ...ex,
            exercise: { ...ex.exercise, id: created.id },
          } as WorkoutExercise;
        })
      );

      let createdPrCount = 0;
      let persistedWorkoutId = workoutId!;

      // Pre-fetch finished workout ids to determine prior history for PR eligibility
      let finishedWorkoutIds = new Set<string>();
      try {
        const allWorkouts = await getWorkouts();
        finishedWorkoutIds = new Set(
          allWorkouts.filter((w) => !!w.endedAt).map((w) => String(w.id))
        );
      } catch (e) {
        // ignore, fallback per-exercise
      }

      for (const ex of exercisesToPersist) {
        // determine if this exercise has appeared in any previously finished workout
        let hadPriorForExercise = false;
        try {
          const priorSets = await getSetsForExercise(String(ex.exercise.id));
          if (finishedWorkoutIds.size > 0) {
            hadPriorForExercise = priorSets.some((ps) =>
              finishedWorkoutIds.has(ps.workout)
            );
          } else {
            hadPriorForExercise = priorSets.length > 0;
          }
        } catch (e) {
          hadPriorForExercise = false;
        }
        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          const isPersisted = /^[0-9]+$/.test(String(s.id));
          const shouldPersist =
            ex.exercise.muscleGroup === "cardio"
              ? (s.cardioDurationSeconds ?? 0) > 0 ||
                (s.cardioDistance ?? 0) > 0 ||
                (s.cardioStat ?? 0) > 0
              : (s.reps || 0) > 0 ||
                (typeof s.weight === "number" && s.weight > 0);
          if (isPersisted || !shouldPersist) continue;

          try {
            // Debug: log API target and ids to help diagnose invalid-PK errors
            try {
              // eslint-disable-next-line no-console
              console.info("saveWorkout: creating set", {
                apiBase: (window as any)?.API_BASE || undefined,
                frontendApiBase: undefined,
                token: localStorage.getItem("token") ? "present" : "missing",
                persistedWorkoutId,
                exerciseId: ex.exercise.id,
                setNumber: i + 1,
              });
            } catch (logErr) {}

            if (ex.exercise.muscleGroup === "cardio") {
              const mode =
                s.cardioMode ||
                getCardioModeForExercise(ex.exercise) ||
                "treadmill";
              const durationSeconds = s.cardioDurationSeconds ?? 0;
              const rawDistance = s.cardioDistance ?? 0;
              const rawStat = s.cardioStat ?? 0;

              let distance: number | undefined;
              let floors: number | undefined;
              let level: number | undefined;
              let splitSeconds: number | undefined;

              if (mode === "stairs") {
                floors = rawDistance || undefined;
                level = rawStat || undefined;
              } else if (mode === "row") {
                distance = rawDistance || undefined;
                splitSeconds = rawStat || undefined;
              } else {
                distance = rawDistance || undefined;
                level = rawStat || undefined;
              }

              const created = await createCardioSet({
                workoutId: persistedWorkoutId,
                exerciseId: ex.exercise.id,
                mode,
                durationSeconds,
                distance,
                floors,
                level,
                splitSeconds,
              });
              if (created.isPR && hadPriorForExercise) createdPrCount += 1;
            } else {
              const created = await createSet({
                workoutId: persistedWorkoutId,
                exerciseId: ex.exercise.id,
                setNumber: i + 1,
                reps: s.reps,
                weight: s.weight,
                unit: s.unit || getUnit(),
                type: s.type,
                rpe: s.rpe,
              });
              // eslint-disable-next-line no-console
              console.info("saveWorkout: created set", {
                id: created.id,
                workout: created.workout,
                exercise: created.exercise,
              });
              if (created.isPR && hadPriorForExercise) createdPrCount += 1;
            }
          } catch (err: any) {
            const text = String(err || "").toLowerCase();
            const mentionsInvalidPk =
              text.includes("invalid pk") ||
              text.includes("object does not exist");
            const mentionsWorkout =
              text.includes("workout") && text.includes("does not exist");
            const mentionsExercise =
              text.includes("exercise") && text.includes("does not exist");

            if (mentionsInvalidPk || mentionsWorkout || mentionsExercise) {
              if (mentionsExercise) {
                try {
                  const createdEx = await createExercise(
                    ex.exercise.name,
                    ex.exercise.muscleGroup as any,
                    (ex.exercise as any).description || ""
                  );
                  ex.exercise = createdEx as any;
                } catch (createExErr) {
                  throw err;
                }
              }

              if (mentionsWorkout || mentionsInvalidPk) {
                const w = await createWorkout(workoutName);
                persistedWorkoutId = w.id;
                setWorkoutId(w.id);
              }

              if (ex.exercise.muscleGroup === "cardio") {
                const mode =
                  s.cardioMode ||
                  getCardioModeForExercise(ex.exercise) ||
                  "treadmill";
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

                const createdRetry = await createCardioSet({
                  workoutId: persistedWorkoutId,
                  exerciseId: ex.exercise.id,
                  mode,
                  durationSeconds,
                  distance,
                  floors,
                  level,
                  splitSeconds,
                });
                if (createdRetry.isPR && hadPriorForExercise)
                  createdPrCount += 1;
              } else {
                const createdRetry = await createSet({
                  workoutId: persistedWorkoutId,
                  exerciseId: ex.exercise.id,
                  setNumber: i + 1,
                  reps: s.reps,
                  weight: s.weight,
                  unit: s.unit || getUnit(),
                  type: s.type,
                  rpe: s.rpe,
                });
                if (createdRetry.isPR && hadPriorForExercise)
                  createdPrCount += 1;
              }
            } else {
              throw err;
            }
          }
        }
      }

      // Optionally save a routine template when originating from a routine template creation flow
      if (fromRoutine && isNewRoutineTemplate) {
        try {
          const templateExercises = nonEmptyExercises.map((ex, index) => ({
            id: ex.id,
            exercise: ex.exercise,
            targetSets: ex.sets.length,
            targetReps: ex.sets[0]?.reps || 0,
            order: index + 1,
          }));

          const newTemplate: Routine = {
            id: fromRoutine.id,
            name: fromRoutine.name,
            description: fromRoutine.description,
            createdAt: new Date(),
            exercises: templateExercises,
          };

          let stored: Routine[] = [];
          try {
            const raw = localStorage.getItem("user:routines");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) stored = parsed as Routine[];
            }
          } catch {
            stored = [];
          }

          const withoutOld = stored.filter((r) => r.id !== newTemplate.id);
          const updated = [...withoutOld, newTemplate];
          localStorage.setItem("user:routines", JSON.stringify(updated));
        } catch {
          // ignore
        }
      }

      // Mark workout as finished so it appears in the logged workouts list
      try {
        await finishWorkout(String(persistedWorkoutId));
        try {
          triggerHaptic();
        } catch (e) {}
      } catch (finishErr) {
        // non-fatal: still show a success toast below, but log the finish error
        console.error("finishWorkout failed", finishErr);
      }

      // Persist a client-side duration override so UI shows the adjusted
      // timer value the user set (backend computes duration from server
      // timestamps which may not reflect user-modified start times).
      try {
        const minutes = Math.max(1, Math.round(elapsedSec / 60));
        localStorage.setItem(
          `workout:durationOverride:${persistedWorkoutId}`,
          String(minutes)
        );
      } catch (e) {
        // non-fatal
      }

      // Persist per-exercise notes locally keyed by workout and exercise name
      try {
        const notesMap: Record<string, string> = {};
        for (const ex of exercisesToPersist) {
          const note = (ex as WorkoutExercise).notes;
          if (note && note.trim()) {
            const key = ex.exercise.name.toLowerCase();
            notesMap[key] = note.trim();
          }
        }
        const storageKey = `workout:exerciseNotes:${persistedWorkoutId}`;
        if (Object.keys(notesMap).length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(notesMap));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        // non-fatal if notes persistence fails
      }

      // Invalidate workouts cache so the Workouts page refreshes
      try {
        queryClient.invalidateQueries({ queryKey: ["workouts"] });
      } catch (iqe) {
        // ignore
      }

      const totalPRs = createdPrCount;
      toast({
        title: "Workout saved!",
        description: `${exercisesToPersist.length} exercises, ${
          totalPRs > 0
            ? `${totalPRs} PR${totalPRs > 1 ? "s" : ""}!`
            : "Great session!"
        }`,
      });
      navigate("/workouts");
      try {
        localStorage.removeItem("workout:inProgress");
        localStorage.removeItem("workout:paused");
      } catch (e) {
        // ignore
      }
    } catch (e) {
      toast({
        title: "Failed to save workout",
        description: String(e),
        variant: "destructive",
      });
    }
  };

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

      {/* PR banner (mirrors EditWorkout) */}
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
            {/* Unusual set entry confirmation */}
            <Dialog
              open={!!unusualSet}
              onOpenChange={(open) => {
                if (!open) setUnusualSet(null);
              }}
            >
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Unusual set entry</DialogTitle>
                  <DialogDescription>
                    This set looks much heavier or higher volume than your
                    previous best for this exercise.
                  </DialogDescription>
                </DialogHeader>
                {unusualSet && (
                  <div className="space-y-3 pt-2 text-sm">
                    <div>
                      <span className="font-medium text-white">
                        Previous best:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {unusualSet.previousBestText}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-white">
                        Current entry:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {unusualSet.newSetText}
                      </span>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setUnusualSet(null)}
                      >
                        Edit set
                      </Button>
                      <Button
                        onClick={() => {
                          if (!unusualSet) return;
                          const { exerciseId, setId } = unusualSet;
                          setUnusualSet(null);
                          // Re-run completion with the unusual check bypassed so
                          // the set is actually logged.
                          void toggleSetComplete(exerciseId, setId, true);
                        }}
                      >
                        Log set
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
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
                      {formatDuration(elapsedSec)}
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
                              {hourOptions.map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setAdjustHours(h)}
                                  className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                                    h === adjustHours
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
                              {minuteOptions.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setAdjustMinutes(m)}
                                  className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                                    m === adjustMinutes
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
                        {startTimeDisplay}
                      </span>
                    </button>
                    {showStartPicker && (
                      <div className="relative mt-2 overflow-hidden rounded-2xl bg-white/[0.02]">
                        <div className="relative max-h-40 overflow-y-auto py-2 scrollbar-hide">
                          {startDateOptions.map((date) => (
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

                  <div className="flex flex-col gap-3 pt-1">
                    <Button
                      className="w-full rounded-xl bg-neutral-900 py-2 text-sm font-semibold text-white hover:bg-neutral-800 shadow-none"
                      onClick={() => {
                        try {
                          if (paused) {
                            localStorage.removeItem("workout:paused");
                          } else {
                            localStorage.setItem("workout:paused", "1");
                          }
                        } catch (e) {}
                        setPaused(!paused);
                      }}
                    >
                      {paused ? "Resume Workout Timer" : "Pause Workout Timer"}
                    </Button>
                    <div className="flex gap-2">
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
                          const total = adjustHours * 3600 + adjustMinutes * 60;
                          setElapsedSec(total);
                          if (startTimeInput) {
                            const dt = new Date(startTimeInput);
                            if (!isNaN(dt.getTime())) {
                              setStartTime(dt);
                            }
                          }
                          setIsDurationDialogOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Input
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="border-none bg-transparent p-0 font-heading text-3xl font-bold focus-visible:ring-0"
            />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {!isRoutineBuilder && (
                <button
                  type="button"
                  className="flex items-center gap-1 underline-offset-4 hover:underline"
                  onClick={() => setIsDurationDialogOpen(true)}
                >
                  <Clock className="h-4 w-4" />
                  {getDuration()}
                </button>
              )}
              <span>{exercises.length} exercises</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(isRoutineBuilder ? "/routines" : "/workouts")
              }
              className="text-white"
            >
              Cancel
            </Button>
            <Button onClick={saveWorkout}>
              <Save className="h-4 w-4 mr-2" />
              {isRoutineBuilder ? "Save Routine" : "Save Workout"}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {exercises.map((workoutExercise) => (
            <Card key={workoutExercise.id} className="sm:mx-0 w-full">
              <CardContent className="px-1 py-4 sm:p-4 overflow-hidden">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-heading text-lg font-semibold text-white">
                        {workoutExercise.exercise.name}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-white"
                        onClick={() => {
                          setExerciseToReplace(workoutExercise.id);
                          setIsExerciseDialogOpen(true);
                        }}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExercise(workoutExercise.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

                {/* Sets Header */}
                {workoutExercise.exercise.muscleGroup === "cardio" ? (
                  <div
                    className="mt-3 mb-1.5 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                    style={{ gridTemplateColumns: GRID_TEMPLATE_CARDIO }}
                  >
                    {/* Column 1: SET */}
                    <span className="flex items-center justify-center text-center">
                      SET
                    </span>

                    {/* Column 2: DURATION */}
                    <span className="flex items-center justify-center text-center">
                      DURATION
                    </span>

                    {/* Column 3: DISTANCE or FLOORS */}
                    <span className="flex items-center justify-center text-center">
                      {getCardioModeForExercise(workoutExercise.exercise) ===
                      "stairs"
                        ? "FLOORS"
                        : "DISTANCE"}
                    </span>

                    {/* Column 4: machine-specific STAT */}
                    <span className="flex items-center justify-center text-center">
                      {(() => {
                        const mode = getCardioModeForExercise(
                          workoutExercise.exercise
                        );
                        if (mode === "treadmill") return "INCLINE";
                        if (mode === "row") return "SPLIT TIME";
                        return "LEVEL";
                      })()}
                    </span>

                    {/* Column 5: Trophy Icon */}
                    <span className="flex items-center justify-center text-center">
                      <Trophy className="mx-auto h-3.5 w-3.5" />
                    </span>

                    {/* Column 6: Placeholder for Checkmark button column */}
                    <div />
                  </div>
                ) : (
                  <div
                    className="mt-3 mb-1.5 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                    style={{ gridTemplateColumns: GRID_TEMPLATE }}
                  >
                    {/* Column 1: SET */}
                    <span className="flex items-center justify-center text-center">
                      SET
                    </span>

                    {/* Column 2: WEIGHT */}
                    <span className="flex items-center justify-center text-center">
                      WEIGHT
                    </span>

                    {/* Column 3: Spacer (6px) */}
                    <div className="flex items-center justify-center" />

                    {/* Column 4: REPS */}
                    <span className="flex items-center justify-center text-center">
                      REPS
                    </span>

                    {/* Column 5: RPE */}
                    <span className="flex items-center justify-center text-center">
                      RPE
                    </span>

                    {/* Column 6: Trophy Icon */}
                    <span className="flex items-center justify-center text-center">
                      <Trophy className="mx-auto h-3.5 w-3.5" />
                    </span>

                    {/* Column 7: Placeholder for Checkmark button column */}
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
                      readOnly={isRoutineBuilder}
                      unitInteractiveWhenReadOnly={isRoutineBuilder}
                      onUpdate={(updates) =>
                        updateSetLocal(workoutExercise.id, set.id, updates)
                      }
                      onUnitChange={(u) => {
                        setUnit(u);
                        updateSetLocal(workoutExercise.id, set.id, { unit: u });
                      }}
                      onComplete={() =>
                        workoutExercise.exercise.muscleGroup === "cardio"
                          ? toggleCardioSetComplete(workoutExercise.id, set.id)
                          : toggleSetComplete(workoutExercise.id, set.id)
                      }
                    />
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSet(workoutExercise.id)}
                    className="flex-1 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Set
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
            setExerciseToReplace(null);
            setIsExerciseDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Exercise
        </Button>

        <Dialog
          open={isExerciseDialogOpen}
          onOpenChange={(open) => {
            setIsExerciseDialogOpen(open);
            if (!open) {
              setExerciseSearch("");
              setExerciseToReplace(null);
            }
          }}
        >
          <DialogContent className="max-h-[85vh] flex flex-col bg-[#0f0f0f] border border-neutral-800/40 text-white">
            <DialogHeader>
              <DialogTitle>
                {exerciseToReplace ? "Replace Exercise" : "Add Exercise"}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {exerciseToReplace
                  ? "Choose a new exercise to replace the current one."
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
                {availableMuscles.map((m) => {
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
                      exerciseToReplace
                        ? replaceExerciseForCard(exerciseToReplace, exercise)
                        : addExercise(exercise)
                    }
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-secondary/50 group"
                  >
                    <div className="flex-1">
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {exercise.name}
                      </p>
                      {(() => {
                        const normalizedGroup =
                          exercise.muscleGroup === "other" &&
                          exercise.name.toLowerCase().includes("calf")
                            ? "calves"
                            : exercise.muscleGroup;
                        return (
                          <Badge
                            variant="secondary"
                            className={muscleGroupColors[normalizedGroup]}
                          >
                            {normalizedGroup}
                          </Badge>
                        );
                      })()}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
