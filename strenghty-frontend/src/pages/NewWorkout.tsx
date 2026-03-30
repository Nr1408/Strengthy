import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogPortal,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import ExerciseInfo from "@/components/workout/ExerciseInfo";
import MuscleTag from "@/components/workout/MuscleTag";
import ExerciseHeader from "@/components/workout/ExerciseHeader";
import { SetRow } from "@/components/workout/SetRow";
import { muscleGroupColors } from "@/data/mockData";
import { getUnit } from "@/lib/utils";
import { getCardioMode, SetsHeader } from "@/components/workout/SetsHeader";
import { libraryExercises as staticLibraryExercises } from "@/data/libraryExercises";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Trophy,
  Clock,
  ChevronDown,
  Trash2,
  Plus,
  ChevronRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateExerciseDialog } from "@/components/workout/CreateExerciseDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createWorkout,
  updateWorkout,
  createSet,
  updateSet,
  patchSetPrFlags,
  createCardioSet,
  updateCardioSet,
  finishWorkout,
  getCardioSetsForWorkout,
  getExercises,
  getSetsForExercise,
  createExercise,
  getToken,
} from "@/lib/api";
import type {
  Routine,
  Exercise,
  WorkoutExercise,
  WorkoutSet,
} from "@/types/workout";

import type {
  Routine,
  Exercise,
  WorkoutExercise,
  WorkoutSet,
} from "@/types/workout";

export default function NewWorkout() {
  const navigate = useNavigate();
  const location = useLocation() as ReturnType<typeof useLocation> & {
    state?: {
      routine?: Routine;
      fromNewRoutine?: boolean;
      forceNew?: boolean;
      originPath?: string;
      originState?: Record<string, unknown> | null;
      reopenExerciseDialog?: boolean;
      addExerciseFromInfo?: boolean;
      exercisePayload?: Exercise;
      exerciseToReplace?: string | null;
    };
  };
  // Persist routine to localStorage so it survives navigation away and back
  // (e.g. browsing exercise info from the picker resets location.state)
  const fromRoutine =
    location.state?.routine ??
    (() => {
      try {
        const raw = localStorage.getItem("workout:currentRoutine");
        if (raw) return JSON.parse(raw) as Routine;
      } catch {}
      return undefined;
    })();

  // Restore fromNewRoutine flag from localStorage if location.state lost it
  const fromNewRoutineFlag =
    location.state?.fromNewRoutine ??
    (() => {
      try {
        return localStorage.getItem("workout:isRoutineBuilder") === "1";
      } catch {}
      return false;
    })();

  const originPath = location.state?.originPath;
  const originState = location.state?.originState ?? null;
  const isNewRoutineTemplate = !!fromNewRoutineFlag;
  const isRoutineBuilder = !!fromNewRoutineFlag;
  // Persist routine identity to localStorage so it survives navigation
  // away and back (e.g. viewing exercise info resets location.state)
  useEffect(() => {
    if (fromRoutine) {
      try {
        localStorage.setItem(
          "workout:currentRoutine",
          JSON.stringify(fromRoutine),
        );
      } catch {}
    }
    // Only persist the builder flag if it came from an actual navigation
    // state (location.state), not from a stale localStorage fallback.
    if (location.state?.fromNewRoutine) {
      try {
        localStorage.setItem("workout:isRoutineBuilder", "1");
      } catch {}
    }
    // run once on mount only
  }, []);
  const isFirstWorkout =
    !!(location.state as any)?.firstTime ||
    !!(location.state as any)?.isFirstWorkout;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workoutId, setWorkoutId] = useState<string | null>(null);
  // Always use the routine name if present, even in builder flow
  const [workoutName, setWorkoutName] = useState<string>(
    fromRoutine?.name ? fromRoutine.name : "Workout",
  );

  // Always keep workoutName in sync with routine name if started from a routine
  useEffect(() => {
    if (fromRoutine && workoutName !== fromRoutine.name) {
      setWorkoutName(fromRoutine.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromRoutine?.name]);
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [startTime, setStartTime] = useState<Date>(() => new Date());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
  const [adjustHours, setAdjustHours] = useState(0);
  const [adjustMinutes, setAdjustMinutes] = useState(0);
  const [startTimeInput, setStartTimeInput] = useState("");
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [paused, setPaused] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("workout:paused");
    } catch {
      return false;
    }
  });

  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");

  const [isEquipmentPickerOpen, setIsEquipmentPickerOpen] = useState(false);
  const [isMusclePickerOpen, setIsMusclePickerOpen] = useState(false);

  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<string | "">("");
  const [newExerciseLogType, setNewExerciseLogType] = useState<
    "strength" | "timed" | "timed+reps"
  >("strength");
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<
    "all" | string
  >("all");
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [isCreateValidationOpen, setIsCreateValidationOpen] = useState(false);
  const [createValidationMessage, setCreateValidationMessage] =
    useState<string>("");

  const [isCreateEquipmentPickerOpen, setIsCreateEquipmentPickerOpen] =
    useState(false);
  const [isCreateMusclePickerOpen, setIsCreateMusclePickerOpen] =
    useState(false);
  const [exerciseToReplace, setExerciseToReplace] = useState<string | null>(
    null,
  );
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const replaceTargetRef = useRef<string | null>(replaceTarget);
  useEffect(() => {
    replaceTargetRef.current = replaceTarget;
  }, [replaceTarget]);
  const [replaceFilter, setReplaceFilter] = useState<string | null>(null);

  const [unusualSet, setUnusualSet] = useState<UnusualSetState | null>(null);
  const recentForced = useRef<Set<string>>(new Set());

  const [emptySetError, setEmptySetError] = useState<string | null>(null);
  const [emptySetContext, setEmptySetContext] = useState<{
    exerciseId: string;
    setId: string;
  } | null>(null);

  const [exerciseInfoOpen, setExerciseInfoOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>();

  const [startedFromRoutine] = useState<boolean>(
    !!fromRoutine || !!location.state?.fromNewRoutine,
  );
  const seededFromRoutineRef = useRef(false);
  const isNavigatingAway = useRef(false);
  const pendingReplaceRef = useRef<{
    workoutExerciseId: string;
    newExercise: Exercise;
  } | null>(null);

  const getEmptySetMessage = (err: any) => {
    const text = String(err?.message || err || "").trim();
    const body =
      err && (err as any).body ? JSON.stringify((err as any).body) : "";
    const combined = `${text} ${body}`.toLowerCase();
    if (
      combined.includes("invalid reps") ||
      combined.includes("reps value") ||
      combined.includes("invalid weight") ||
      combined.includes("weight value")
    ) {
      if (combined.includes("reps")) return "Reps must be greater than 0.";
      if (combined.includes("weight")) return "Weight must be greater than 0.";
      return "Please enter a valid number of reps.";
    }
    return null;
  };

  const hasToken = typeof window !== "undefined" && !!getToken();

  const { data: userExercises = [] } = useQuery({
    queryKey: ["exercises", hasToken],
    queryFn: getExercises,
    enabled: hasToken,
  });

  const createExerciseMutation = useMutation({
    mutationFn: async () =>
      createExercise(
        newExerciseName,
        (newExerciseMuscle as any) || "other",
        newExerciseDescription,
        {
          custom: true,
          logType: newExerciseLogType,
          equipment:
            newExerciseEquipment !== "all" ? newExerciseEquipment : undefined,
        },
      ),
    onSuccess: (created: any) => {
      try {
        queryClient.invalidateQueries({ queryKey: ["exercises"] });
      } catch (e) {}
      try {
        const rt = replaceTargetRef.current;
        if (rt) replaceExercise(rt, created);
        else addExercise(created);
      } catch (e) {}
      setIsCreateExerciseOpen(false);
      setIsExerciseDialogOpen(false);
      setNewExerciseName("");
      setNewExerciseMuscle("");
      setNewExerciseEquipment("all");
      setNewExerciseDescription("");
      setNewExerciseLogType("strength");
      toast({ title: "Exercise created" });
    },
    onError: (err: any) =>
      toast({
        title: "Create failed",
        description: String(err),
        variant: "destructive",
      }),
  });

  const handleCreateExercise = () => {
    const missing: string[] = [];
    if (!newExerciseName.trim()) missing.push("a name");
    if (!newExerciseMuscle) missing.push("a muscle group");
    if (newExerciseEquipment === "all") missing.push("equipment");
    if (missing.length > 0) {
      const msg = `Please provide ${missing.join(", ")} before creating.`;
      setCreateValidationMessage(msg);
      setIsCreateValidationOpen(true);
      return;
    }
    createExerciseMutation.mutate();
  };

  type PrBanner = {
    exerciseName: string;
    label: string;
    value: string;
  };
  const [prBanner, setPrBanner] = useState<PrBanner | null>(null);
  const [prQueue, setPrQueue] = useState<PrBanner[]>([]);
  const [prVisible, setPrVisible] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);

  type UnusualSetState =
    | {
        type: "history";
        exerciseId: string;
        setId: string;
        previousBestText: string;
        newSetText: string;
        ratio: number;
      }
    | {
        type: "firstTime";
        exerciseId: string;
        setId: string;
        previousBestText: null;
        newSetText: string;
        weightKg: number;
        reps: number;
      };

  const createWorkoutMutation = useMutation({
    mutationFn: async (name: string) => {
      const w = await createWorkout(name, notes, startTime);
      return w;
    },
    onSuccess: (w: any) => {
      setWorkoutId(w.id);
      try {
        queryClient.invalidateQueries({ queryKey: ["workouts"] });
      } catch (e) {}
    },
    onError: (err: any) =>
      toast({
        title: "Failed to start workout",
        description: String(err),
        variant: "destructive",
      }),
  });

  // Restore in-progress workout if one exists; otherwise create a new one
  useEffect(() => {
    if (isRoutineBuilder) return;

    // If we already have a workout id, do nothing here
    if (workoutId) return;

    try {
      const inProg = localStorage.getItem("workout:inProgress");
      if (inProg) {
        const obj = JSON.parse(inProg);
        if (obj && obj.id) {
          setWorkoutId(obj.id);
          const saved = localStorage.getItem(`workout:state:${obj.id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            // ALWAYS restore exercises if they exist in localStorage
            if (
              parsed.exercises &&
              Array.isArray(parsed.exercises) &&
              parsed.exercises.length > 0
            ) {
              setExercises(parsed.exercises);

              // Apply any pending replace after exercises are restored
              if (pendingReplaceRef.current) {
                const { workoutExerciseId, newExercise } =
                  pendingReplaceRef.current;
                pendingReplaceRef.current = null;
                const isCardio = newExercise.muscleGroup === "cardio";
                const cardioMode = isCardio
                  ? getCardioMode(newExercise.name)
                  : undefined;
                setExercises((prev) =>
                  prev.map((we) => {
                    if (we.id !== workoutExerciseId) return we;
                    return {
                      ...we,
                      exercise: newExercise,
                      sets: we.sets.map(() => ({
                        id: crypto.randomUUID(),
                        reps: 0,
                        halfReps: 0,
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
                      })),
                    };
                  }),
                );
              }
            }
            if (typeof parsed.elapsedSec === "number")
              setElapsedSec(parsed.elapsedSec);
            if (parsed.startTime) {
              const dt = new Date(parsed.startTime);
              if (!isNaN(dt.getTime())) setStartTime(dt);
            }
            // Don't overwrite the routine name if we started from a routine
            if (parsed.workoutName && !fromRoutine)
              setWorkoutName(parsed.workoutName);
            if (parsed.notes) setNotes(parsed.notes);
          }
          try {
            const resumeRequested =
              localStorage.getItem("workout:resumeRequested") === "1";
            if (resumeRequested) {
              try {
                localStorage.removeItem("workout:resumeRequested");
                localStorage.removeItem("workout:paused");
              } catch (e) {}
              setPaused(false);
            } else {
              try {
                localStorage.setItem("workout:paused", "1");
              } catch (e) {}
              setPaused(true);
            }
          } catch (e) {}
          return;
        }
      }
    } catch (e) {}

    if (!workoutId) {
      // Save routine so it survives navigate-away-and-back
      if (fromRoutine) {
        try {
          localStorage.setItem(
            "workout:currentRoutine",
            JSON.stringify(fromRoutine),
          );
        } catch {}
      }
      if (location.state?.fromNewRoutine) {
        try {
          localStorage.setItem("workout:isRoutineBuilder", "1");
        } catch {}
      }
      // Always use the routine name if present
      createWorkoutMutation.mutate(fromRoutine?.name || workoutName);
    }
  }, [workoutId, workoutName, isRoutineBuilder]);

  // Handle returning from ExerciseInfo page (opened via fromPicker flow).
  // Handle returning from ExerciseInfo page (opened via fromPicker flow).
  useEffect(() => {
    const state = location.state;
    console.log("[Return from info] state:", JSON.stringify(state));
    if (!state) return;
    if (state.addExerciseFromInfo && state.exercisePayload) {
      console.log(
        "[Return from info] exerciseToReplace from state:",
        state.exerciseToReplace,
      );
      console.log(
        "[Return from info] exerciseToReplace from localStorage:",
        localStorage.getItem("workout:exerciseToReplace"),
      );
      console.log(
        "[Return from info] current exercises:",
        exercises.map((e) => ({ id: e.id, name: e.exercise.name })),
      );
      const payload = state.exercisePayload as Exercise;
      const toReplace =
        state.exerciseToReplace ??
        (() => {
          try {
            return localStorage.getItem("workout:exerciseToReplace");
          } catch {
            return null;
          }
        })();

      try {
        localStorage.removeItem("workout:exerciseToReplace");
      } catch {}

      if (toReplace) {
        // Defer the replace until after exercises are restored from storage
        pendingReplaceRef.current = {
          workoutExerciseId: toReplace,
          newExercise: payload,
        };
      } else {
        addExercise(payload);
      }
      navigate("/workouts/new", { replace: true, state: null });
    } else if (state.reopenExerciseDialog) {
      const toReplace = state.exerciseToReplace ?? null;
      setExerciseToReplace(toReplace);
      setIsExerciseDialogOpen(true);
      navigate("/workouts/new", { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!fromRoutine || isRoutineBuilder) return;
    if (seededFromRoutineRef.current) return;
    if (exercises.length > 0) return;
    // Don't reseed if an in-progress workout exists — the restore useEffect will populate exercises
    try {
      const inProg = localStorage.getItem("workout:inProgress");
      if (inProg) {
        seededFromRoutineRef.current = true;
        return;
      }
    } catch {}

    const routineExercises = Array.isArray(fromRoutine.exercises)
      ? fromRoutine.exercises
      : [];
    if (routineExercises.length === 0) return;

    const isUserRoutine = (() => {
      try {
        const raw = localStorage.getItem("user:routines");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.some((r) => String(r.id) === String(fromRoutine?.id));
          }
        }
      } catch (e) {}
      return String(fromRoutine?.id || "").startsWith("my-");
    })();

    const seeded = routineExercises.map((re: any) => {
      const exercise = re.exercise || re;
      const targetSets = Math.max(1, Number(re.targetSets || 1));
      const targetReps = Number(re.targetReps || 0);
      const isCardio = exercise?.muscleGroup === "cardio";

      const baseSet = {
        reps: 0,
        halfReps: 0,
        weight: null,
        unit: getUnit(),
        isPR: false,
        completed: false,
        type: "S" as const,
        rpe: undefined,
        ...(isCardio && {
          cardioMode: getCardioMode(exercise.name),
          cardioDurationSeconds: 0,
          cardioDistance: 0,
          cardioDistanceUnit: "km" as const,
          cardioStat: 0,
        }),
        // mark seeded sets so UI can show a greyed '-' placeholder
        _seededFromUserRoutine: isUserRoutine,
      };

      return {
        id: crypto.randomUUID(),
        exercise,
        notes: "",
        sets: Array.from({ length: targetSets }).map(() => ({
          ...baseSet,
          id: crypto.randomUUID(),
        })),
      };
    });

    setExercises(seeded);
    // If this routine is a user-created/custom routine, try to prefill
    // suggested weight/reps from the user's most recent sets for each
    // exercise so the routine view isn't full of zeros.
    (async () => {
      try {
        const isUserRoutine = (() => {
          try {
            const raw = localStorage.getItem("user:routines");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                return parsed.some(
                  (r) => String(r.id) === String(fromRoutine?.id),
                );
              }
            }
          } catch (e) {}
          // Fallback: treat locally-created ids as "my-..." as user routines
          return String(fromRoutine?.id || "").startsWith("my-");
        })();

        if (!isUserRoutine) return;

        const updated = await Promise.all(
          seeded.map(async (ex) => {
            try {
              const prior = await getSetsForExercise(String(ex.exercise.id));
              if (prior && prior.length > 0) {
                const recent = prior[0];
                const suggestedWeight =
                  typeof recent.weight === "number" && recent.weight > 0
                    ? recent.weight
                    : undefined;
                const suggestedReps =
                  typeof recent.reps === "number" && recent.reps > 0
                    ? recent.reps
                    : undefined;
                if (
                  suggestedWeight ||
                  suggestedReps ||
                  typeof recent.rpe === "number" ||
                  (recent.halfReps || 0) > 0
                ) {
                  const suggestedRpe =
                    typeof recent.rpe === "number" ? recent.rpe : undefined;
                  const suggestedHalf =
                    typeof recent.halfReps === "number" && recent.halfReps > 0
                      ? recent.halfReps
                      : undefined;
                  return {
                    ...ex,
                    sets: ex.sets.map((s: any) => ({
                      ...s,
                      // Attach suggestion metadata - SetRow will render these
                      // greyed when the actual value is empty/zero.
                      _suggestedWeight: suggestedWeight,
                      _suggestedReps: suggestedReps,
                      _suggestedRpe: suggestedRpe,
                      _suggestedHalfReps: suggestedHalf,
                    })),
                  };
                }
              }
            } catch (e) {}
            return ex;
          }),
        );
        setExercises(updated);
      } catch (e) {
        // ignore
      }
    })();
    seededFromRoutineRef.current = true;
  }, [fromRoutine, isRoutineBuilder, exercises.length]);

  useEffect(() => {
    console.log("[Save Check]", {
      isRoutineBuilder,
      exercisesLength: exercises.length,
      exercises: exercises.map((e) => e.exercise.name),
      pathname: location.pathname,
      isNavigatingAway: isNavigatingAway.current,
    });

    // In routine builder mode, save to a different key
    if (isRoutineBuilder) {
      // Don't save empty routines
      if (exercises.length === 0) {
        console.log("[Save] Skipping - no exercises to save");
        return;
      }

      // Don't save if we're navigating away
      if (isNavigatingAway.current) {
        console.log("[Save] Skipping - navigating away");
        return;
      }

      console.log("[Save] Saving to localStorage:", {
        exercisesLength: exercises.length,
        exercises: exercises.map((e) => e.exercise.name),
      });

      try {
        localStorage.setItem(
          "workout:routineBuilder",
          JSON.stringify({
            exercises,
            workoutName,
            notes,
            routineId: fromRoutine?.id ?? null,
          }),
        );
        console.log("[Save] Saved successfully");
      } catch (e) {
        console.error("[Save] Failed:", e);
      }
      return;
    }

    // Normal workout mode - save as before
    if (!workoutId) return;
    if (isNavigatingAway.current) {
      console.log("[Save] Skipping - navigating away");
      return;
    }
    try {
      localStorage.setItem(
        `workout:state:${workoutId}`,
        JSON.stringify({
          exercises,
          elapsedSec,
          workoutName,
          notes,
          startTime,
          routineId: fromRoutine?.id ?? null,
        }),
      );
    } catch (e) {}
  }, [
    exercises,
    elapsedSec,
    workoutId,
    workoutName,
    notes,
    isRoutineBuilder,
    fromRoutine?.id,
    location.pathname,
  ]);

  // Reset navigating flag when pathname changes (component remounts or route changes)
  useEffect(() => {
    isNavigatingAway.current = false;
  }, [location.pathname]);

  // Restore exercises in routine builder mode
  useEffect(() => {
    console.log("[Restore Check]", {
      isRoutineBuilder,
      exercisesLength: exercises.length,
      pathname: location.pathname,
    });

    if (!isRoutineBuilder) {
      console.log("[Restore] Skipping - not in routine builder mode");
      return;
    }

    if (exercises.length > 0) {
      console.log("[Restore] Skipping - already have exercises");
      return;
    }

    try {
      // If caller explicitly requested a fresh builder, clear any saved builder state
      if (location.state?.forceNew) {
        try {
          localStorage.removeItem("workout:routineBuilder");
        } catch {}
        return;
      }

      const saved = localStorage.getItem("workout:routineBuilder");
      console.log("[Restore] localStorage value:", saved);

      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("[Restore] Parsed:", parsed);

        // Only restore if the saved builder matches the current routine context.
        // This prevents carrying over exercises between different routine builds
        // or between distinct "new routine" sessions.
        const savedRoutineId = parsed?.routineId ?? null;
        const currentRoutineId = fromRoutine?.id ?? null;
        if (String(savedRoutineId) !== String(currentRoutineId)) {
          try {
            localStorage.removeItem("workout:routineBuilder");
          } catch {}
          console.log(
            "[Restore] Skipping - stored routineBuilder belongs to a different routine",
          );
          return;
        }

        if (
          parsed.exercises &&
          Array.isArray(parsed.exercises) &&
          parsed.exercises.length > 0
        ) {
          console.log(
            "Restoring",
            parsed.exercises.length,
            "exercises from routine builder storage",
          );
          setExercises(parsed.exercises);

          // Apply any pending replace after exercises are restored
          if (pendingReplaceRef.current) {
            const { workoutExerciseId, newExercise } =
              pendingReplaceRef.current;
            pendingReplaceRef.current = null;
            const isCardio = newExercise.muscleGroup === "cardio";
            const cardioMode = isCardio
              ? getCardioMode(newExercise.name)
              : undefined;
            setExercises((prev) =>
              prev.map((we) => {
                if (we.id !== workoutExerciseId) return we;
                return {
                  ...we,
                  exercise: newExercise,
                  sets: we.sets.map(() => ({
                    id: crypto.randomUUID(),
                    reps: 0,
                    halfReps: 0,
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
                  })),
                };
              }),
            );
          }
        }
      }
    } catch (e) {
      console.error("Failed to restore routine builder exercises:", e);
    }
  }, [location.pathname, isRoutineBuilder]);

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

  // Restore exercises when returning from navigation (e.g., from ExerciseInfo)
  useEffect(() => {
    // Skip if we're in routine builder mode or don't have a workoutId yet
    if (isRoutineBuilder || !workoutId) return;

    // Skip if we already have exercises - don't overwrite them
    if (exercises.length > 0) return;

    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem(`workout:state:${workoutId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.exercises &&
          Array.isArray(parsed.exercises) &&
          parsed.exercises.length > 0
        ) {
          // eslint-disable-next-line no-console
          console.log(
            "Restoring",
            parsed.exercises.length,
            "exercises from localStorage",
          );
          setExercises(parsed.exercises);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to restore exercises:", e);
    }
  }, [location.pathname, workoutId, isRoutineBuilder]);

  useEffect(() => {
    if (!workoutId || isRoutineBuilder) return;
    if (paused) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [workoutId, paused, isRoutineBuilder]);

  useEffect(() => {
    if (!isDurationDialogOpen) return;
    const total = elapsedSec;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    setAdjustHours(h);
    setAdjustMinutes(m);
    const dt = startTime;
    const pad = (n: number) => String(n).padStart(2, "0");
    const value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate(),
    )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setStartTimeInput(value);
    setShowDurationPicker(false);
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
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
          }),
        );
        if (!startedFromRoutine) {
          localStorage.removeItem("workout:paused");
        }
      } catch (e) {}
    }
  }, [workoutId, isRoutineBuilder]);

  // When building a routine, mark it as an in-progress special workout so
  // other parts of the app (dashboard/dialog) can detect and resume it.
  useEffect(() => {
    try {
      if (isRoutineBuilder && exercises.length > 0) {
        localStorage.setItem(
          "workout:inProgress",
          JSON.stringify({
            id: "routine-builder",
            startedAt: new Date().toISOString(),
            routineId: fromRoutine?.id ?? null,
            isRoutineBuilder: true,
          }),
        );
      } else if (isRoutineBuilder && exercises.length === 0) {
        localStorage.removeItem("workout:inProgress");
      }
    } catch (e) {}
  }, [isRoutineBuilder, exercises.length, fromRoutine?.id]);

  const [filterMuscle, setFilterMuscle] = useState<"all" | string>("all");
  const [filterEquipment, setFilterEquipment] = useState<"all" | string>("all");

  const allExercises = useMemo(() => {
    const map = new Map<string, Exercise>();

    const isHiitName = (name: string) => {
      const n = (name || "").toLowerCase();
      return (
        n.includes("burpee") ||
        n.includes("mountain") ||
        n.includes("climb") ||
        n.includes("jump squat") ||
        n.includes("plank jack") ||
        n.includes("skater")
      );
    };

    const normalize = (e: Exercise): Exercise => ({
      ...e,
      muscleGroup: isHiitName(e.name)
        ? "cardio"
        : e.muscleGroup === "other"
          ? "calves"
          : e.muscleGroup,
    });

    staticLibraryExercises.forEach((e) =>
      map.set(e.name.toLowerCase(), normalize(e as Exercise)),
    );

    (userExercises as Exercise[]).forEach((e) => {
      const key = e.name.toLowerCase();
      const existing = map.get(key);
      map.set(
        key,
        normalize({
          ...e,
          equipment: (e as any).equipment ?? existing?.equipment,
        }),
      );
    });

    return Array.from(map.values());
  }, [userExercises]);

  const availableMuscles = useMemo(() => {
    const set = new Set<string>();
    allExercises.forEach((e) => set.add(e.muscleGroup));
    return Array.from(set);
  }, [allExercises]);

  const availableEquipments = useMemo(() => {
    const set = new Set<string>();
    allExercises.forEach((e) => {
      if (e.equipment) set.add(e.equipment);
    });
    return Array.from(set);
  }, [allExercises]);

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    const isHiitName = (name: string) => {
      const n = (name || "").toLowerCase();
      return (
        n.includes("burpee") ||
        n.includes("mountain") ||
        n.includes("climb") ||
        n.includes("jump squat") ||
        n.includes("plank jack") ||
        n.includes("skater")
      );
    };
    if (filterEquipment !== "all") {
      try {
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, "");
        const sel = normalize(String(filterEquipment));
        const mismatches = allExercises
          .filter(
            (e) => !e.equipment || normalize(e.equipment.toString()) !== sel,
          )
          .slice(0, 6)
          .map((e) => ({ name: e.name, equipment: e.equipment }));
        // eslint-disable-next-line no-console
        console.log(
          "[DEBUG] filterEquipment=",
          filterEquipment,
          "sel=",
          sel,
          "mismatchSample=",
          mismatches,
        );
      } catch (e) {}
    }

    return allExercises.filter((exercise) => {
      if (filterMuscle !== "all") {
        if (
          !(
            exercise.muscleGroup === filterMuscle ||
            (filterMuscle === "cardio" && isHiitName(exercise.name))
          )
        )
          return false;
      }
      if (filterEquipment !== "all") {
        const eqRaw = exercise.equipment?.toString();
        if (!eqRaw) return false;
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, "");
        const eq = normalize(eqRaw);
        const sel = normalize(String(filterEquipment));
        if (eq !== sel) return false;
      }
      if (!q) return true;
      return (
        exercise.name.toLowerCase().includes(q) ||
        exercise.muscleGroup.toLowerCase().includes(q)
      );
    });
  }, [exerciseSearch, allExercises, filterMuscle, filterEquipment]);

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

  const isHiitName = (name: string) => {
    const n = (name || "").toLowerCase();
    return (
      n.includes("burpee") ||
      n.includes("mountain") ||
      n.includes("climb") ||
      n.includes("jump squat") ||
      n.includes("plank jack") ||
      n.includes("skater")
    );
  };

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

  const toLocalWorkoutDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const syncWorkoutDate = async (d: Date) => {
    if (!workoutId || isRoutineBuilder) return;
    try {
      await updateWorkout(String(workoutId), { date: toLocalWorkoutDate(d) });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    } catch (e) {}
  };

  const setStartDateOnly = (date: Date) => {
    const dt = new Date(startTime);
    dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setStartTime(dt);
    void syncWorkoutDate(dt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate(),
    )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setStartTimeInput(value);
  };

  const setStartClockTime = (hours: number, minutes: number) => {
    const dt = new Date(startTime);
    dt.setHours(hours, minutes, 0, 0);
    setStartTime(dt);
    void syncWorkoutDate(dt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate(),
    )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setStartTimeInput(value);
  };

  const formatTimeLabel = (d: Date) =>
    d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const startHour12Options = Array.from({ length: 12 }, (_, i) => i + 1);
  const startMinuteOptions = Array.from({ length: 61 }, (_, i) => i);
  const meridiemOptions = ["AM", "PM"] as const;
  const currentHour24 = startTime.getHours();
  const currentHour12 = currentHour24 % 12 === 0 ? 12 : currentHour24 % 12;
  const currentMinute = startTime.getMinutes();
  const currentMeridiem: "AM" | "PM" = currentHour24 >= 12 ? "PM" : "AM";

  const setStartClockTime12 = (
    hour12: number,
    minute: number,
    meridiem: "AM" | "PM",
  ) => {
    let hour24 = hour12 % 12;
    if (meridiem === "PM") hour24 += 12;

    let minuteValue = minute;
    if (minuteValue >= 60) {
      minuteValue = 0;
      hour24 = (hour24 + 1) % 24;
    }

    setStartClockTime(hour24, minuteValue);
  };

  const startDateOptions: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = -30; offset <= 30; offset += 1) {
    const d = new Date(startTime);
    d.setDate(d.getDate() + offset);
    const candidate = new Date(d);
    candidate.setHours(0, 0, 0, 0);
    if (candidate.getTime() > today.getTime()) continue;
    startDateOptions.push(d);
  }

  const startDateListRef = useRef<HTMLDivElement | null>(null);
  const startDateScrollTimeout = useRef<number | null>(null);

  const onStartDateScroll = () => {
    const el = startDateListRef.current;
    if (!el) return;
    if (startDateScrollTimeout.current) {
      window.clearTimeout(startDateScrollTimeout.current);
    }
    startDateScrollTimeout.current = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + el.clientHeight / 2;
      const children = Array.from(el.children) as HTMLElement[];
      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        const cr = c.getBoundingClientRect();
        if (centerY >= cr.top && centerY <= cr.bottom) {
          const date = startDateOptions[i];
          if (date) setStartDateOnly(date);
          break;
        }
      }
    }, 120) as unknown as number;
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const addExercise = (exercise: Exercise) => {
    const isCardio = exercise.muscleGroup === "cardio";
    const cardioMode = isCardio ? getCardioMode(exercise.name) : undefined;
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

  const ensureEquipment = (e: Exercise): string | undefined =>
    e && e.equipment ? e.equipment : undefined;

  const replaceExerciseForCard = (
    workoutExerciseId: string,
    newExercise: Exercise,
  ) => {
    const isCardio = newExercise.muscleGroup === "cardio";
    const cardioMode = isCardio ? getCardioMode(newExercise.name) : undefined;
    setExercises((prev) =>
      prev.map((we) => {
        if (we.id !== workoutExerciseId) return we;
        const resetSets: WorkoutSet[] = we.sets.map(() => ({
          id: crypto.randomUUID(),
          reps: 0,
          halfReps: 0,
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
      }),
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

                cardioMode:
                  ex.exercise.muscleGroup === "cardio"
                    ? ((lastSet as any)?.cardioMode ??
                      getCardioMode(ex.exercise.name))
                    : undefined,

                cardioDistanceUnit:
                  ex.exercise.muscleGroup === "cardio"
                    ? ((lastSet as any)?.cardioDistanceUnit ?? "km")
                    : undefined,

                cardioDurationSeconds:
                  ex.exercise.muscleGroup === "cardio"
                    ? ((lastSet as any)?.cardioDurationSeconds ?? 0)
                    : undefined,

                cardioDistance:
                  ex.exercise.muscleGroup === "cardio"
                    ? ((lastSet as any)?.cardioDistance ?? 0)
                    : undefined,

                cardioStat:
                  ex.exercise.muscleGroup === "cardio"
                    ? ((lastSet as any)?.cardioStat ?? 0)
                    : undefined,
              },
            ],
          };
        }
        return ex;
      }),
    );
  };

  const updateSetLocal = (
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>,
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.id === setId ? { ...set, ...updates } : set,
            ),
          };
        }
        return ex;
      }),
    );
  };

  const acknowledgeEmptySetError = () => {
    if (emptySetContext) {
      updateSetLocal(emptySetContext.exerciseId, emptySetContext.setId, {
        completed: false,
      });
    }
    setEmptySetContext(null);
    setEmptySetError(null);
  };

  const toggleSetComplete = async (
    exerciseId: string,
    setId: string,
    force = false,
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.id === setId ? { ...set, completed: !set.completed } : set,
            ),
          };
        }
        return ex;
      }),
    );

    if (isRoutineBuilder) return;

    const ex = exercises.find((e) => e.id === exerciseId);
    const set = ex?.sets.find((s) => s.id === setId);
    if (!ex || !set) return;

    const nowCompleted = !set.completed;
    if (!nowCompleted) return;

    const currentWorkoutCompletedSets = ex.sets
      .filter(
        (s2) =>
          s2.id !== setId &&
          s2.completed &&
          ((s2.weight ?? 0) > 0 || (s2.reps || 0) > 0),
      )
      .map((s2) => ({
        weight: s2.weight,
        reps: s2.reps,
        unit: s2.unit,
      }));

    try {
      let wId = workoutId;
      if (!wId) {
        const w = await createWorkout(workoutName, notes, startTime);
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
          (ue) => normalize(ue.name) === targetNorm,
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
                : e,
            ),
          );
        } else {
          const created = await createExercise(
            ex.exercise.name,
            ex.exercise.muscleGroup as any,
            (ex.exercise as any).description || "",
            { custom: true, equipment: ensureEquipment(ex.exercise) },
          );
          backendExerciseId = String(created.id);
          setExercises((prev) =>
            prev.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    exercise: { ...e.exercise, id: created.id },
                  }
                : e,
            ),
          );
        }
      }

      const mode =
        set.cardioMode || getCardioMode(ex.exercise.name) || "treadmill";

      const isPersisted = /^\d+$/.test(String(set.id));

      const durationSeconds = set.cardioDurationSeconds ?? 0;
      const rawDistance = set.cardioDistance;
      const rawStatBase = set.cardioStat ?? 0;

      const isHiitName = (ex.exercise.name || "")
        .toLowerCase()
        .match(/burpee|mountain|climb|jump squat|plank jack|skater/);
      const rawStat = isHiitName ? set.reps || 0 : rawStatBase;
      const distanceUnit =
        (set as any).cardioDistanceUnit === "mile"
          ? "mile"
          : (set as any).cardioDistanceUnit === "m"
            ? "m"
            : (set as any).cardioDistanceUnit === "flr"
              ? "flr"
              : "km";

      let distance: number | undefined;
      let floors: number | undefined;
      let level: number | undefined;
      let splitSeconds: number | undefined;

      if (mode === "stairs") {
        const distUnit = (set as any).cardioDistanceUnit === "m" ? "m" : "flr";
        if (distUnit === "m") {
          distance = rawDistance || undefined;
        } else {
          floors = rawDistance || undefined;
        }
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
          if (isHiitName) {
            floors = set.reps || 0 || undefined;
            level = undefined;
          } else {
            level = rawStat || undefined;
          }
        }
      }

      let saved;
      try {
        if (isPersisted) {
          saved = await updateSet(String(set.id), {
            reps: set.reps,
            halfReps: (set as any).halfReps || 0,
            weight: set.weight,
            unit: set.unit || getUnit(),
            type: set.type,
            rpe: set.rpe,
          });
        } else {
          saved = await createSet({
            workoutId: String(wId),
            exerciseId: backendExerciseId,
            setNumber: ex.sets.indexOf(set) + 1,
            reps: set.reps,
            halfReps: (set as any).halfReps || 0,
            weight: set.weight,
            unit: set.unit || getUnit(),
            type: set.type,
            rpe: set.rpe,
          });
        }
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
                (ex.exercise as any).description || "",
                { custom: true, equipment: ensureEquipment(ex.exercise) },
              );
              backendExerciseId = String(createdEx.id);
              setExercises((prev) =>
                prev.map((e) =>
                  e.id === exerciseId
                    ? { ...e, exercise: { ...e.exercise, id: createdEx.id } }
                    : e,
                ),
              );
            } catch (createExErr) {
              throw err;
            }
          }

          if (mentionsWorkout || mentionsInvalidPk) {
            const w = await createWorkout(workoutName, notes, startTime);
            setWorkoutId(w.id);
            wId = w.id;
          }

          // Retry by creating a strength set (server will resolve set number)
          saved = await createSet({
            workoutId: String(wId),
            exerciseId: backendExerciseId,
            setNumber: ex.sets.indexOf(set) + 1,
            reps: set.reps,
            halfReps: (set as any).halfReps || 0,
            weight: set.weight,
            unit: set.unit || getUnit(),
            type: set.type,
            rpe: set.rpe,
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
                        isPR: saved.isPR ?? false,
                        absWeightPR: saved.absWeightPR ?? false,
                        e1rmPR: saved.e1rmPR ?? false,
                        volumePR: saved.volumePR ?? false,
                        repPR: saved.repPR ?? false,
                        unit: saved.unit ?? s.unit,
                        weight:
                          typeof (saved as any).weight === "number"
                            ? (saved as any).weight
                            : s.weight,
                        reps:
                          typeof (saved as any).reps === "number"
                            ? (saved as any).reps
                            : s.reps,
                        halfReps:
                          typeof (saved as any).halfReps === "number"
                            ? (saved as any).halfReps
                            : (s as any).halfReps,
                      }
                    : s,
                ),
              },
        ),
      );

      if (saved.isPR) {
        const banners: PrBanner[] = [];
        const isHiitCardio = !!(ex.exercise.name || "")
          .toLowerCase()
          .match(/burpee|mountain|climb|jump squat|plank jack|skater/);
        if (isHiitCardio) {
          const repsValue =
            typeof saved.floors === "number" && saved.floors > 0
              ? Math.round(saved.floors)
              : typeof set.reps === "number" && set.reps > 0
                ? Math.round(set.reps)
                : 0;
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Most no of reps",
            value: String(repsValue),
          });
        } else if (saved.distancePR) {
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
        // Strength PR banners (heaviest / 1RM / volume)
        const isStrengthLike = ex.exercise.muscleGroup !== "cardio";
        if (!isHiitCardio && isStrengthLike) {
          const unit = (saved.unit as "lbs" | "kg" | undefined) || getUnit();
          const weight = typeof saved.weight === "number" ? saved.weight : 0;
          const reps = typeof saved.reps === "number" ? saved.reps : 0;

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
        }
        if (!isHiitCardio && saved.pacePR) {
          const formatMmSs = (seconds: number) => {
            const total = Math.max(0, Math.round(seconds));
            const mins = Math.floor(total / 60);
            const secs = total % 60;
            return `${mins}:${String(secs).padStart(2, "0")}`;
          };

          const computeRowPacePerKm = (
            splitSeconds: number | null | undefined,
            durationSeconds: number | null | undefined,
            distanceRaw: number | null | undefined,
          ): number | null => {
            if (typeof splitSeconds === "number" && splitSeconds > 0) {
              return splitSeconds * 2;
            }
            if (
              typeof durationSeconds !== "number" ||
              durationSeconds <= 0 ||
              typeof distanceRaw !== "number" ||
              distanceRaw <= 0
            ) {
              return null;
            }

            const distanceKm =
              distanceRaw > 50 ? distanceRaw / 1000 : distanceRaw;
            if (distanceKm <= 0) return null;

            const pacePerKm = durationSeconds / distanceKm;
            return pacePerKm >= 20 ? pacePerKm : null;
          };

          let paceValue = "";
          if (mode === "row") {
            const pacePerKm =
              computeRowPacePerKm(
                saved.splitSeconds,
                saved.durationSeconds,
                saved.distance,
              ) ??
              computeRowPacePerKm(
                set.cardioStat,
                set.cardioDurationSeconds,
                set.cardioDistance,
              );
            if (typeof pacePerKm === "number" && pacePerKm > 0) {
              paceValue = `${formatMmSs(pacePerKm)} /km`;
            }
          } else if (
            mode === "treadmill" ||
            mode === "bike" ||
            mode === "elliptical"
          ) {
            if (
              typeof saved.durationSeconds === "number" &&
              saved.durationSeconds > 0 &&
              typeof saved.distance === "number" &&
              saved.distance > 0
            ) {
              if (distanceUnit === "mile") {
                const distanceMi = saved.distance / 1609.34;
                const pacePerMi = saved.durationSeconds / distanceMi;
                if (pacePerMi >= 20) paceValue = `${formatMmSs(pacePerMi)} /mi`;
              } else {
                const distanceKm = saved.distance / 1000;
                const pacePerKm = saved.durationSeconds / distanceKm;
                if (pacePerKm >= 20) paceValue = `${formatMmSs(pacePerKm)} /km`;
              }
            }
          }
          banners.push({
            exerciseName: ex.exercise.name,
            label: mode === "stairs" ? "Intensity PR" : "Pace PR",
            value: paceValue,
          });
        }
        if (!isHiitCardio && saved.ascentPR) {
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Ascent PR",
            value: saved.floors != null ? `${saved.floors} floors` : "",
          });
        }
        if (!isHiitCardio && saved.intensityPR) {
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Intensity PR",
            value:
              saved.level != null
                ? String(saved.level)
                : saved.spm != null
                  ? `${saved.spm} spm`
                  : saved.floors != null
                    ? `${saved.floors} reps`
                    : "",
          });
        }
        if (!isHiitCardio && saved.splitPR) {
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
      const emptyMessage = getEmptySetMessage(err);
      if (emptyMessage) {
        setEmptySetError(emptyMessage);
        setEmptySetContext({ exerciseId, setId });
        return;
      }
      toast({
        title: "Failed to log set",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const toggleCardioSetComplete = async (exerciseId: string, setId: string) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    const set = ex?.sets.find((s) => s.id === setId);
    if (!ex || !set) return;

    const isStrengthLike = ex.exercise.muscleGroup !== "cardio";

    if (isStrengthLike) {
      await toggleSetComplete(exerciseId, setId);
      return;
    }

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.id === setId ? { ...set, completed: !set.completed } : set,
            ),
          };
        }
        return ex;
      }),
    );

    if (isRoutineBuilder) return;

    const nowCompleted = !set.completed;
    if (!nowCompleted) return;

    try {
      let wId = workoutId;
      if (!wId) {
        const w = await createWorkout(workoutName, notes, startTime);
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
          (ue) => normalize(ue.name) === targetNorm,
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
                : e,
            ),
          );
        } else {
          const created = await createExercise(
            ex.exercise.name,
            ex.exercise.muscleGroup as any,
            (ex.exercise as any).description || "",
            { custom: true, equipment: ensureEquipment(ex.exercise) },
          );
          backendExerciseId = String(created.id);
          setExercises((prev) =>
            prev.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    exercise: { ...e.exercise, id: created.id },
                  }
                : e,
            ),
          );
        }
      }

      const mode =
        set.cardioMode || getCardioMode(ex.exercise.name) || "treadmill";

      const isPersisted = /^\d+$/.test(String(set.id));

      const durationSeconds = set.cardioDurationSeconds ?? 0;
      const rawDistance = set.cardioDistance;
      const rawStatBase = set.cardioStat ?? 0;

      const isHiitName = (ex.exercise.name || "")
        .toLowerCase()
        .match(/burpee|mountain|climb|jump squat|plank jack|skater/);
      const rawStat = isHiitName ? set.reps || 0 : rawStatBase;
      const distanceUnit =
        (set as any).cardioDistanceUnit === "mile"
          ? "mile"
          : (set as any).cardioDistanceUnit === "m"
            ? "m"
            : (set as any).cardioDistanceUnit === "flr"
              ? "flr"
              : "km";

      let distance: number | undefined;
      let floors: number | undefined;
      let level: number | undefined;
      let splitSeconds: number | undefined;

      if (mode === "stairs") {
        const distUnit = (set as any).cardioDistanceUnit === "m" ? "m" : "flr";
        if (distUnit === "m") {
          distance = rawDistance || undefined;
        } else {
          floors = rawDistance || undefined;
        }
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
          if (isHiitName) {
            floors = set.reps || 0 || undefined;
            level = undefined;
          } else {
            level = rawStat || undefined;
          }
        }
      }

      let saved;
      try {
        if (isPersisted) {
          saved = await updateCardioSet(String(set.id), {
            mode,
            durationSeconds,
            distance,
            floors,
            level,
            splitSeconds,
          });
        } else {
          let setNumberToUse: number | undefined = undefined;
          try {
            const existing = await getCardioSetsForWorkout(String(wId));
            const sameEx = (existing || []).filter(
              (c: any) => String(c.exercise) === String(backendExerciseId),
            );
            const max = sameEx.reduce(
              (m: number, it: any) =>
                Math.max(
                  m,
                  typeof it.setNumber === "number" ? it.setNumber : 0,
                ),
              0,
            );
            setNumberToUse = max + 1;
          } catch (e) {
            setNumberToUse = undefined;
          }

          const payload: any = {
            workoutId: String(wId),
            exerciseId: backendExerciseId,
            mode,
            durationSeconds,
            distance,
            floors,
            level,
            splitSeconds,
          };
          if (typeof setNumberToUse === "number")
            payload.setNumber = setNumberToUse;
          saved = await createCardioSet(payload);
        }
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
                (ex.exercise as any).description || "",
                { custom: true, equipment: ensureEquipment(ex.exercise) },
              );
              backendExerciseId = String(createdEx.id);
              setExercises((prev) =>
                prev.map((e) =>
                  e.id === exerciseId
                    ? { ...e, exercise: { ...e.exercise, id: createdEx.id } }
                    : e,
                ),
              );
            } catch (createExErr) {
              throw err;
            }
          }

          if (mentionsWorkout || mentionsInvalidPk) {
            const w = await createWorkout(workoutName, notes, startTime);
            setWorkoutId(w.id);
            wId = w.id;
          }

          let setNumberToUseFallback: number | undefined = undefined;
          try {
            const existing = await getCardioSetsForWorkout(String(wId));
            const sameEx = (existing || []).filter(
              (c: any) => String(c.exercise) === String(backendExerciseId),
            );
            const max = sameEx.reduce(
              (m: number, it: any) =>
                Math.max(
                  m,
                  typeof it.setNumber === "number" ? it.setNumber : 0,
                ),
              0,
            );
            setNumberToUseFallback = max + 1;
          } catch (e) {
            setNumberToUseFallback = undefined;
          }

          const payloadFallback: any = {
            workoutId: String(wId),
            exerciseId: backendExerciseId,
            mode,
            durationSeconds,
            distance,
            floors,
            level,
            splitSeconds,
          };
          if (typeof setNumberToUseFallback === "number")
            payloadFallback.setNumber = setNumberToUseFallback;
          saved = await createCardioSet(payloadFallback);
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
                    : s,
                ),
              },
        ),
      );

      if (saved.isPR) {
        const banners: PrBanner[] = [];
        const isHiitCardio = !!(ex.exercise.name || "")
          .toLowerCase()
          .match(/burpee|mountain|climb|jump squat|plank jack|skater/);

        if (isHiitCardio) {
          const repsValue =
            typeof saved.floors === "number" && saved.floors > 0
              ? Math.round(saved.floors)
              : typeof set.reps === "number" && set.reps > 0
                ? Math.round(set.reps)
                : 0;
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Most no of reps",
            value: String(repsValue),
          });
        } else if (saved.distancePR) {
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
        if (!isHiitCardio && saved.pacePR) {
          const formatMmSs = (seconds: number) => {
            const total = Math.max(0, Math.round(seconds));
            const mins = Math.floor(total / 60);
            const secs = total % 60;
            return `${mins}:${String(secs).padStart(2, "0")}`;
          };

          const computeRowPacePerKm = (
            splitSeconds: number | null | undefined,
            durationSeconds: number | null | undefined,
            distanceRaw: number | null | undefined,
          ): number | null => {
            if (typeof splitSeconds === "number" && splitSeconds > 0) {
              return splitSeconds * 2;
            }
            if (
              typeof durationSeconds !== "number" ||
              durationSeconds <= 0 ||
              typeof distanceRaw !== "number" ||
              distanceRaw <= 0
            ) {
              return null;
            }

            const distanceKm =
              distanceRaw > 50 ? distanceRaw / 1000 : distanceRaw;
            if (distanceKm <= 0) return null;

            const pacePerKm = durationSeconds / distanceKm;
            return pacePerKm >= 20 ? pacePerKm : null;
          };

          let paceValue = "";
          if (mode === "row") {
            const pacePerKm =
              computeRowPacePerKm(
                saved.splitSeconds,
                saved.durationSeconds,
                saved.distance,
              ) ??
              computeRowPacePerKm(
                set.cardioStat,
                set.cardioDurationSeconds,
                set.cardioDistance,
              );
            if (typeof pacePerKm === "number" && pacePerKm > 0) {
              paceValue = `${formatMmSs(pacePerKm)} /km`;
            }
          } else if (
            mode === "treadmill" ||
            mode === "bike" ||
            mode === "elliptical"
          ) {
            if (
              typeof saved.durationSeconds === "number" &&
              saved.durationSeconds > 0 &&
              typeof saved.distance === "number" &&
              saved.distance > 0
            ) {
              if (distanceUnit === "mile") {
                const distanceMi = saved.distance / 1609.34;
                const pacePerMi = saved.durationSeconds / distanceMi;
                if (pacePerMi >= 20) paceValue = `${formatMmSs(pacePerMi)} /mi`;
              } else {
                const distanceKm = saved.distance / 1000;
                const pacePerKm = saved.durationSeconds / distanceKm;
                if (pacePerKm >= 20) paceValue = `${formatMmSs(pacePerKm)} /km`;
              }
            }
          }
          banners.push({
            exerciseName: ex.exercise.name,
            label: mode === "stairs" ? "Intensity PR" : "Pace PR",
            value: paceValue,
          });
        }
        if (!isHiitCardio && saved.ascentPR) {
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Ascent PR",
            value: saved.floors != null ? `${saved.floors} floors` : "",
          });
        }
        if (!isHiitCardio && saved.intensityPR) {
          banners.push({
            exerciseName: ex.exercise.name,
            label: "Intensity PR",
            value:
              saved.level != null
                ? String(saved.level)
                : saved.spm != null
                  ? `${saved.spm} spm`
                  : saved.floors != null
                    ? `${saved.floors} reps`
                    : "",
          });
        }
        if (!isHiitCardio && saved.splitPR) {
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
      }),
    );
  };

  const saveWorkout = async () => {
    if (isSavingWorkout) return;

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

    if (!isRoutineBuilder) {
      const hasAtLeastOneLoggedSet = exercises.some((ex) =>
        ex.sets.some((s) => {
          if (!s.completed) return false;
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
        }),
      );
      if (!hasAtLeastOneLoggedSet) {
        toast({
          title: "No sets logged",
          description:
            "Please log at least one set before saving your workout.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSavingWorkout(true);

    try {
      // --- Ensure workout name matches routine name if started from a routine ---
      // Compute effectiveWorkoutName FIRST so all subsequent logic uses it.
      let effectiveWorkoutName = workoutName;
      if (fromRoutine) {
        effectiveWorkoutName = fromRoutine.name;
        setWorkoutName(fromRoutine.name);
      }

      // If we're in the routine builder flow, persist all sets for the new workout
      if (isRoutineBuilder) {
        try {
          const templateExercises = exercises.map((ex, index) => ({
            id: ex.id,
            exercise: ex.exercise,
            targetSets: ex.sets.length,
            targetReps: ex.sets[0]?.reps || 0,
            order: index + 1,
          }));

          const newTemplate: Routine = {
            id: fromRoutine?.id ?? `my-${crypto.randomUUID()}`,
            name: effectiveWorkoutName,
            description: fromRoutine?.description ?? undefined,
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
          localStorage.setItem("user:routines:updated", Date.now().toString());
          window.dispatchEvent(new Event("routines:updated"));

          // Create a workout record and persist all sets for each exercise
          let logged;
          try {
            logged = await createWorkout(effectiveWorkoutName, "", new Date());
            // Persist all sets for each exercise
            for (const ex of exercises) {
              let backendExerciseId = String(ex.exercise.id);
              if (!/^[0-9]+$/.test(backendExerciseId)) {
                // Fallback: use the exercise id as is (for custom, not-yet-saved exercises)
                backendExerciseId = ex.exercise.id;
              }
              let setNumber = 1;
              for (const set of ex.sets) {
                try {
                  await createSet({
                    workoutId: String(logged.id),
                    exerciseId: backendExerciseId,
                    setNumber,
                    reps: set.reps,
                    halfReps: set.halfReps || 0,
                    weight: set.weight,
                    unit: set.unit,
                    type: set.type,
                    rpe: set.rpe,
                  });
                  setNumber++;
                } catch (e) {
                  // Ignore set errors, continue with others
                }
              }
            }
            try {
              await finishWorkout(String(logged.id));
            } catch (e) {}
          } catch (e) {}

          // Cleanup builder-specific storage
          try {
            localStorage.removeItem("workout:inProgress");
            localStorage.removeItem("workout:currentRoutine");
            localStorage.removeItem("workout:isRoutineBuilder");
            localStorage.removeItem("workout:routineBuilder");
            localStorage.removeItem("workout:paused");
          } catch (e) {}

          toast({ title: "Routine saved" });
          setIsSavingWorkout(false);
          navigate(isRoutineBuilder ? "/routines" : "/workouts");
          return;
        } catch (e) {
          // fall through to normal save error handling
        }
      }

      // Ensure we have a workout on the backend before persisting sets.
      // If one already exists but was created with the wrong name (e.g. stale
      // "Workout" default), patch it to the correct routine name.
      if (!workoutId) {
        try {
          const w = await createWorkout(effectiveWorkoutName, notes, startTime);
          setWorkoutId(w.id);
        } catch (e) {
          toast({
            title: "Failed to start workout",
            description: String(e),
            variant: "destructive",
          });
          return;
        }
      } else if (fromRoutine) {
        // Workout was pre-created on mount — patch its name to the routine name
        try {
          await updateWorkout(String(workoutId), {
            name: effectiveWorkoutName,
          });
        } catch (e) {
          // non-fatal — name patch failure shouldn't block saving
        }
      }

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
        }),
      );

      const exercisesToPersist = await Promise.all(
        nonEmptyExercises.map(async (ex) => {
          const exIdStr = String(ex.exercise.id);
          if (/^[0-9]+$/.test(exIdStr)) return ex;

          const targetNorm = normalize(ex.exercise.name);
          const match = userExercises.find(
            (ue) => normalize(ue.name) === targetNorm,
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
            (ex.exercise as any).description || "",
            { custom: true, equipment: ensureEquipment(ex.exercise) },
          );
          return {
            ...ex,
            exercise: { ...ex.exercise, id: created.id },
          } as WorkoutExercise;
        }),
      );

      let createdPrCount = 0;
      let persistedWorkoutId = workoutId!;

      const cardioMaxByExercise: Record<string, number> = {};
      const existingCardioByExercise: Record<string, any[]> = {};
      try {
        const existingCardio = await getCardioSetsForWorkout(
          String(persistedWorkoutId),
        );
        (existingCardio || []).forEach((c: any) => {
          const exId = String(c.exercise);
          const num = typeof c.setNumber === "number" ? c.setNumber : 0;
          cardioMaxByExercise[exId] = Math.max(
            cardioMaxByExercise[exId] || 0,
            num,
          );
          if (!existingCardioByExercise[exId])
            existingCardioByExercise[exId] = [];
          existingCardioByExercise[exId].push(c);
        });
      } catch (e) {}

      const cardioSkipCountByExercise: Record<string, number> = {};
      for (const ex of exercisesToPersist) {
        if (ex.exercise.muscleGroup !== "cardio") continue;
        const exId = String(ex.exercise.id);
        const persistedLocalCount = ex.sets.filter((s2) =>
          /^[0-9]+$/.test(String(s2.id)),
        ).length;
        const existingDbCount = (existingCardioByExercise[exId] || []).length;
        cardioSkipCountByExercise[exId] = Math.max(
          0,
          existingDbCount - persistedLocalCount,
        );
      }

      for (const ex of exercisesToPersist) {
        let hadPriorForExercise = false;
        let priorSetsForExercise: any[] = [];
        try {
          priorSetsForExercise = await getSetsForExercise(
            String(ex.exercise.id),
            String(persistedWorkoutId),
          );
          hadPriorForExercise = priorSetsForExercise.length > 0;
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

          if (!isPersisted && priorSetsForExercise.length > 0) {
            try {
              const match = priorSetsForExercise.find((ps) => {
                try {
                  return (
                    (ps.reps == null ? 0 : Number(ps.reps)) === (s.reps || 0) &&
                    (ps.weight == null ? 0 : Number(ps.weight)) ===
                      (s.weight || 0)
                  );
                } catch (e) {
                  return false;
                }
              });
              if (match) {
                try {
                  setExercises((prev) =>
                    prev.map((e) =>
                      e.id !== ex.id
                        ? e
                        : {
                            ...e,
                            sets: e.sets.map((ss) =>
                              ss.id === s.id ? { ...ss, id: match.id } : ss,
                            ),
                          },
                    ),
                  );
                  s.id = match.id;
                } catch (e) {}
                continue;
              }
            } catch (e) {}
          }

          if (ex.exercise.muscleGroup === "cardio") {
            const exId = String(ex.exercise.id);
            if ((cardioSkipCountByExercise[exId] ?? 0) > 0) {
              cardioSkipCountByExercise[exId]--;
              continue;
            }
          }

          try {
            try {
              // eslint-disable-next-line no-console
              console.info("saveWorkout: creating set", {
                persistedWorkoutId,
                exerciseId: ex.exercise.id,
                setNumber: i + 1,
              });
            } catch (logErr) {}

            if (ex.exercise.muscleGroup === "cardio") {
              const mode =
                s.cardioMode || getCardioMode(ex.exercise.name) || "treadmill";
              const durationSeconds = s.cardioDurationSeconds ?? 0;
              const rawDistance = s.cardioDistance ?? 0;
              const rawStatBase = s.cardioStat ?? 0;

              const isHiitName = (ex?.exercise?.name || "")
                .toLowerCase()
                .match(/burpee|mountain|climb|jump squat|plank jack|skater/);
              const rawStat = isHiitName ? s.reps || 0 : rawStatBase;

              let distance: number | undefined;
              let floors: number | undefined;
              let level: number | undefined;
              let splitSeconds: number | undefined;

              const distanceUnit =
                (s as any).cardioDistanceUnit === "mile"
                  ? "mile"
                  : (s as any).cardioDistanceUnit === "m"
                    ? "m"
                    : (s as any).cardioDistanceUnit === "flr"
                      ? "flr"
                      : "km";

              if (mode === "stairs") {
                const distUnit =
                  (s as any).cardioDistanceUnit === "m" ? "m" : "flr";
                if (distUnit === "m") {
                  distance = rawDistance || undefined;
                } else {
                  floors = rawDistance || undefined;
                }
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
                  if (isHiitName) {
                    floors = s.reps || 0 || undefined;
                    level = undefined;
                  } else {
                    level = rawStat || undefined;
                  }
                }
              }

              const exKey = String(ex.exercise.id);
              const next = (cardioMaxByExercise[exKey] || 0) + 1;
              cardioMaxByExercise[exKey] = next;

              const payload: any = {
                workoutId: persistedWorkoutId,
                exerciseId: ex.exercise.id,
                mode,
                durationSeconds,
                distance,
                floors,
                level,
                splitSeconds,
              };
              payload.setNumber = next;

              const created: any = await createCardioSet(payload);
              if (hadPriorForExercise) {
                createdPrCount += countPrTypesFromSet(created);
              }
            } else {
              const created = await createSet({
                workoutId: persistedWorkoutId,
                exerciseId: ex.exercise.id,
                setNumber: i + 1,
                reps: s.reps,
                halfReps: (s as any).halfReps || 0,
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
              if (hadPriorForExercise) {
                createdPrCount += countPrTypesFromSet(created);
              }
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
                    (ex.exercise as any).description || "",
                    { custom: true, equipment: ensureEquipment(ex.exercise) },
                  );
                  ex.exercise = createdEx as any;
                } catch (createExErr) {
                  throw err;
                }
              }

              if (mentionsWorkout || mentionsInvalidPk) {
                const w = await createWorkout(
                  effectiveWorkoutName,
                  notes,
                  startTime,
                );
                persistedWorkoutId = w.id;
                setWorkoutId(w.id);
              }

              if (ex.exercise.muscleGroup === "cardio") {
                const mode =
                  s.cardioMode ||
                  getCardioMode(ex.exercise.name) ||
                  "treadmill";
                const durationSeconds = s.cardioDurationSeconds ?? 0;
                const rawDistance = s.cardioDistance ?? 0;
                const rawStat = s.cardioStat ?? 0;
                const distanceUnit =
                  (s as any).cardioDistanceUnit === "mile"
                    ? "mile"
                    : (s as any).cardioDistanceUnit === "m"
                      ? "m"
                      : (s as any).cardioDistanceUnit === "flr"
                        ? "flr"
                        : "km";

                let distance: number | undefined;
                let floors: number | undefined;
                let level: number | undefined;
                let splitSeconds: number | undefined;

                if (mode === "stairs") {
                  const distUnit =
                    (s as any).cardioDistanceUnit === "m" ? "m" : "flr";
                  if (distUnit === "m") {
                    distance = rawDistance || undefined;
                  } else {
                    floors = rawDistance || undefined;
                  }
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

                const exKeyRetry = String(ex.exercise.id);
                const nextRetry = (cardioMaxByExercise[exKeyRetry] || 0) + 1;
                cardioMaxByExercise[exKeyRetry] = nextRetry;

                const payloadRetry: any = {
                  workoutId: persistedWorkoutId,
                  exerciseId: ex.exercise.id,
                  mode,
                  durationSeconds,
                  distance,
                  floors,
                  level,
                  splitSeconds,
                };
                payloadRetry.setNumber = nextRetry;

                const createdRetry: any = await createCardioSet(payloadRetry);
                if (hadPriorForExercise) {
                  createdPrCount += countPrTypesFromSet(createdRetry);
                }
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
                if (hadPriorForExercise) {
                  createdPrCount += countPrTypesFromSet(createdRetry);
                }
              }
            } else {
              throw err;
            }
          }
        }
      }

      // Save routine to localStorage with full exercise list.
      // We do this ONCE after all sets are persisted, then dispatch a single event.
      if (fromRoutine) {
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
          localStorage.setItem("user:routines:updated", Date.now().toString());
          // Single dispatch after the full routine (with exercises) is saved
          window.dispatchEvent(new Event("routines:updated"));
          // If this save originated from the routine builder, also create a
          // minimal finished workout entry so the routine appears in the
          // Workouts list as a completed workout with the routine name.
          if (isRoutineBuilder) {
            try {
              const logged = await createWorkout(
                newTemplate.name,
                "",
                new Date(),
              );
              try {
                await finishWorkout(String(logged.id));
              } catch (e) {}
            } catch (e) {}
          }
        } catch (e) {
          // ignore routine update errors
        }
      }

      // Mark workout as finished so it appears in the logged workouts list
      try {
        await finishWorkout(String(persistedWorkoutId));
        try {
          triggerHaptic();
        } catch (e) {}
      } catch (finishErr) {
        console.error("finishWorkout failed", finishErr);
      }

      try {
        const minutes = Math.max(1, Math.round(elapsedSec / 60));
        localStorage.setItem(
          `workout:durationOverride:${persistedWorkoutId}`,
          String(minutes),
        );
      } catch (e) {}

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
      } catch (e) {}

      try {
        queryClient.invalidateQueries({ queryKey: ["workouts"] });
      } catch (iqe) {}

      const totalPRs = createdPrCount;
      toast({
        title: "Workout saved!",
        description: `${exercisesToPersist.length} exercises, ${
          totalPRs > 0
            ? `${totalPRs} PR${totalPRs > 1 ? "s" : ""}!`
            : "Great session!"
        }`,
      });

      try {
        const firstDone = localStorage.getItem("user:firstWorkoutCompleted");
        const isFirstWorkoutFromState = !!(location.state as any)
          ?.isFirstWorkout;
        if (!firstDone || isFirstWorkoutFromState) {
          let suggested = null as any;
          try {
            const routineId =
              fromRoutine?.id ??
              (() => {
                try {
                  const raw = localStorage.getItem(
                    `workout:state:${persistedWorkoutId}`,
                  );
                  if (raw) return JSON.parse(raw)?.routineId ?? null;
                } catch {}
                return null;
              })();

            if (routineId) {
              suggested = recommendNextRoutine(routineId);
            }

            if (!suggested?.routine) {
              try {
                const stored = localStorage.getItem(
                  "user:nextSuggestedRoutine",
                );
                if (stored) {
                  const { id, label: storedLabel } = JSON.parse(stored);
                  const { mockRoutines } = await import("@/data/mockData");
                  const routine = mockRoutines.find((r: any) => r.id === id);
                  if (routine) suggested = { routine, label: storedLabel };
                }
              } catch {}
            }

            if (!suggested?.routine) {
              const { mockRoutines } = await import("@/data/mockData");
              const fallback =
                mockRoutines.find((r: any) => r.id !== fromRoutine?.id) ??
                mockRoutines[0];
              if (fallback)
                suggested = {
                  routine: fallback,
                  label: `Next: ${fallback.name}`,
                };
            }
          } catch (e) {
            suggested = null;
          }

          try {
            if (suggested && suggested.routine) {
              localStorage.setItem(
                "user:nextSuggestedRoutine",
                JSON.stringify({
                  id: suggested.routine.id,
                  label: suggested.label,
                }),
              );
            }
          } catch (e) {}

          try {
            localStorage.setItem("user:firstWorkoutCompleted", "1");
            localStorage.removeItem("workout:inProgress");
            try {
              localStorage.removeItem("workout:currentRoutine");
            } catch {}
            try {
              localStorage.removeItem("workout:isRoutineBuilder");
            } catch {}
            try {
              localStorage.removeItem("workout:routineBuilder");
            } catch {}
            localStorage.removeItem("workout:paused");
            navigate("/workouts/complete", {
              state: {
                suggestedRoutine: suggested?.routine ?? null,
                label: suggested?.label ?? "Keep the momentum going!",
              },
            });
            return;
          } catch (e) {
            navigate("/workouts");
            return;
          }
        }
      } catch (e) {}

      try {
        const routineId =
          fromRoutine?.id ??
          (() => {
            try {
              const raw = localStorage.getItem(
                `workout:state:${persistedWorkoutId}`,
              );
              if (raw) return JSON.parse(raw)?.routineId ?? null;
            } catch {}
            return null;
          })();
        if (routineId) {
          const suggested = recommendNextRoutine(routineId);
          if (suggested?.routine) {
            try {
              localStorage.setItem(
                "user:nextSuggestedRoutine",
                JSON.stringify({
                  id: suggested.routine.id,
                  label: suggested.label,
                }),
              );
            } catch {}
          }
        }
      } catch {}

      navigate("/workouts");
      try {
        localStorage.removeItem("workout:inProgress");
        try {
          localStorage.removeItem("workout:currentRoutine");
        } catch {}
        try {
          localStorage.removeItem("workout:isRoutineBuilder");
        } catch {}
        try {
          localStorage.removeItem("workout:routineBuilder");
        } catch {}
        localStorage.removeItem("workout:paused");
      } catch (e) {}
    } catch (e) {
      toast({
        title: "Failed to save workout",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setIsSavingWorkout(false);
    }
  };

  return (
    <AppLayout>
      {/* PR banner */}
      <div
        className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 flex justify-center w-full px-4"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 92px)" }}
      >
        <div
          className={`pointer-events-auto flex items-center gap-3 rounded-full bg-zinc-800 px-4 py-2 shadow-md shadow-black/30 border border-white/25 ring-1 ring-white/5 max-w-xs sm:max-w-md transition-all duration-200 ease-out transform ${
            prVisible && prBanner
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-2 scale-95"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-black">
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

        <ExerciseInfo
          exerciseId={selectedExerciseId}
          exerciseName={selectedExerciseName}
          muscleGroup={selectedMuscleGroup}
          open={exerciseInfoOpen}
          onOpenChange={(o: boolean) => setExerciseInfoOpen(o)}
        />
      </div>

      {/* Fixed top action bar */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] bg-zinc-900 border-b border-white/10 shadow-sm shadow-black/30 will-change-transform"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {!isFirstWorkout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                try {
                  localStorage.removeItem("workout:currentRoutine");
                } catch {}
                try {
                  localStorage.removeItem("workout:isRoutineBuilder");
                } catch {}
                // Clean up the in-progress flag when canceling
                if (isRoutineBuilder) {
                  try {
                    localStorage.removeItem("workout:inProgress");
                    localStorage.removeItem("workout:routineBuilder");
                    // IMPORTANT: Remove the routine from user:routines if it was auto-saved
                    if (fromRoutine?.id) {
                      const stored = localStorage.getItem("user:routines");
                      if (stored) {
                        const routines = JSON.parse(stored);
                        const filtered = routines.filter(
                          (r: any) => r.id !== fromRoutine.id,
                        );
                        localStorage.setItem(
                          "user:routines",
                          JSON.stringify(filtered),
                        );
                        localStorage.setItem(
                          "user:routines:updated",
                          Date.now().toString(),
                        );
                        window.dispatchEvent(new Event("routines:updated"));
                      }
                    }
                  } catch {}
                }
                navigate(
                  originPath || (isRoutineBuilder ? "/routines" : "/workouts"),
                  { state: originState ?? undefined },
                );
              }}
            >
              Cancel
            </Button>
          )}
          {isFirstWorkout && <div className="w-16" />}
          <Button size="sm" onClick={saveWorkout} disabled={isSavingWorkout}>
            {isSavingWorkout
              ? "Saving..."
              : isRoutineBuilder
                ? "Save Routine"
                : "Save Workout"}
          </Button>
        </div>
      </div>

      <div
        className="space-y-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            {/* History-based anomaly dialog */}
            <Dialog
              open={!!unusualSet && unusualSet?.type === "history"}
              onOpenChange={(open) => {
                if (!open) setUnusualSet(null);
              }}
            >
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <DialogTitle>Review set entry</DialogTitle>
                  </div>
                  <DialogDescription className="mt-2">
                    This entry differs significantly from your previous best for
                    this exercise. Please review the values before logging.
                  </DialogDescription>
                </DialogHeader>
                {unusualSet && unusualSet.type === "history" && (
                  <div className="pt-3 text-sm">
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col">
                        <dt className="text-xs font-medium text-muted-foreground">
                          Previous best
                        </dt>
                        <dd className="mt-1 text-sm text-white break-words">
                          {unusualSet.previousBestText}
                        </dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-xs font-medium text-muted-foreground">
                          Current entry
                        </dt>
                        <dd className="mt-1 text-sm text-white break-words">
                          {unusualSet.newSetText}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-300">
                        Current entry is{" "}
                        <span className="font-semibold">
                          {unusualSet.ratio}×
                        </span>{" "}
                        your previous best
                      </p>
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
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
                          recentForced.current.add(setId);
                          setTimeout(
                            () => recentForced.current.delete(setId),
                            3000,
                          );
                          setUnusualSet(null);
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

            {/* First-time extreme entry dialog */}
            <Dialog
              open={!!unusualSet && unusualSet?.type === "firstTime"}
              onOpenChange={(open) => {
                if (!open) setUnusualSet(null);
              }}
            >
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Confirm first record</DialogTitle>
                  <DialogDescription>
                    This is your first recorded set for this exercise and the
                    values are unusually high. Please confirm before saving.
                  </DialogDescription>
                </DialogHeader>
                {unusualSet && unusualSet.type === "firstTime" && (
                  <div className="pt-3 text-sm">
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">
                          First record
                        </dt>
                        <dd className="mt-1 text-sm text-muted-foreground">
                          No previous data available
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">
                          Entered
                        </dt>
                        <dd className="mt-1 text-sm text-white">
                          {unusualSet.weightKg.toFixed(1)} kg ×{" "}
                          {unusualSet.reps} reps
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex justify-end gap-3">
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
                          recentForced.current.add(setId);
                          setTimeout(
                            () => recentForced.current.delete(setId),
                            3000,
                          );
                          setUnusualSet(null);
                          void toggleSetComplete(exerciseId, setId, true);
                        }}
                      >
                        Confirm & log
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog
              open={!!emptySetError}
              onOpenChange={(open) => {
                if (!open) acknowledgeEmptySetError();
              }}
            >
              <DialogContent className="max-w-sm rounded-2xl bg-neutral-900/95 p-6 text-center shadow-2xl">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <DialogHeader className="items-center text-center">
                  <DialogTitle className="text-lg font-semibold text-white">
                    Invalid Set
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-muted-foreground">
                    {emptySetError || "Reps must be greater than 0."}
                  </DialogDescription>
                </DialogHeader>
                <div className="pt-5">
                  <Button size="sm" onClick={acknowledgeEmptySetError}>
                    OK
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isDurationDialogOpen}
              onOpenChange={(open) => {
                setIsDurationDialogOpen(open);
                if (!open) {
                  try {
                    localStorage.removeItem("workout:paused");
                  } catch (e) {}
                  setPaused(false);
                }
              }}
            >
              <DialogContent className="max-w-[360px] rounded-[28px] bg-neutral-950 border border-neutral-800/40 text-white pb-4 pt-2">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-800" />
                <DialogHeader className="items-center text-center pb-1">
                  <DialogTitle className="font-heading text-base font-semibold tracking-tight">
                    Duration
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-1">
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
                            <div
                              className="relative h-32 w-16 overflow-y-auto py-1 scrollbar-hide"
                              style={{ WebkitOverflowScrolling: "touch" }}
                            >
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
                            <div
                              className="relative h-32 w-16 overflow-y-auto py-1 scrollbar-hide"
                              style={{ WebkitOverflowScrolling: "touch" }}
                            >
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
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowStartDatePicker((v) => !v);
                          setShowStartTimePicker(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-neutral-900/60 px-3 py-2 text-left"
                      >
                        <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                          Date
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {formatDateLabel(startTime)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowStartTimePicker((v) => !v);
                          setShowStartDatePicker(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-neutral-900/60 px-3 py-2 text-left"
                      >
                        <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                          Time
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {formatTimeLabel(startTime)}
                        </span>
                      </button>
                    </div>
                    {showStartDatePicker && (
                      <div className="relative mt-2 overflow-hidden rounded-2xl bg-white/[0.02]">
                        <div
                          ref={startDateListRef}
                          onScroll={onStartDateScroll}
                          className="relative max-h-40 overflow-y-auto py-2 scrollbar-hide"
                          style={{ WebkitOverflowScrolling: "touch" }}
                        >
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
                    {showStartTimePicker && (
                      <div className="relative mt-2 overflow-hidden rounded-2xl bg-white/[0.02]">
                        <div className="relative grid grid-cols-3 items-center gap-3 px-2 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                              Hr
                            </span>
                            <div
                              className="relative h-32 w-full overflow-y-auto py-1 scrollbar-hide"
                              style={{ WebkitOverflowScrolling: "touch" }}
                            >
                              {startHour12Options.map((h) => (
                                <button
                                  key={`start-hour-${h}`}
                                  type="button"
                                  onClick={() =>
                                    setStartClockTime12(
                                      h,
                                      currentMinute,
                                      currentMeridiem,
                                    )
                                  }
                                  className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                                    h === currentHour12
                                      ? "font-semibold text-white bg-neutral-800/80"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {h}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                              Min
                            </span>
                            <div
                              className="relative h-32 w-full overflow-y-auto py-1 scrollbar-hide"
                              style={{ WebkitOverflowScrolling: "touch" }}
                            >
                              {startMinuteOptions.map((m) => (
                                <button
                                  key={`start-minute-${m}`}
                                  type="button"
                                  onClick={() =>
                                    setStartClockTime12(
                                      currentHour12,
                                      m,
                                      currentMeridiem,
                                    )
                                  }
                                  className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                                    m === currentMinute
                                      ? "font-semibold text-white bg-neutral-800/80"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {String(m).padStart(2, "0")}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                              AM/PM
                            </span>
                            <div
                              className="relative h-32 w-full overflow-y-auto py-1 scrollbar-hide"
                              style={{ WebkitOverflowScrolling: "touch" }}
                            >
                              {meridiemOptions.map((mer) => (
                                <button
                                  key={`start-meridiem-${mer}`}
                                  type="button"
                                  onClick={() =>
                                    setStartClockTime12(
                                      currentHour12,
                                      currentMinute,
                                      mer,
                                    )
                                  }
                                  className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                                    mer === currentMeridiem
                                      ? "font-semibold text-white bg-neutral-800/80"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {mer}
                                </button>
                              ))}
                            </div>
                          </div>
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
                        onClick={() => {
                          try {
                            localStorage.removeItem("workout:paused");
                          } catch (e) {}
                          setPaused(false);
                          setIsDurationDialogOpen(false);
                        }}
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
                              void syncWorkoutDate(dt);
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
        </div>

        <div className="space-y-6">
          {exercises.map((workoutExercise) => (
            <Card
              key={workoutExercise.id}
              className="sm:mx-0 w-full rounded-2xl overflow-hidden"
            >
              <CardContent className="px-1 py-4 sm:p-4 overflow-hidden">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-start gap-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <ExerciseHeader
                              exerciseName={workoutExercise.exercise.name}
                              muscleGroup={workoutExercise.exercise.muscleGroup}
                              isCustom={workoutExercise.exercise.custom}
                              onClick={() => {
                                try {
                                  isNavigatingAway.current = true;
                                  const exId = String(
                                    workoutExercise.exercise.id,
                                  );
                                  navigate(`/exercises/${exId}/info`, {
                                    state: {
                                      exerciseName:
                                        workoutExercise.exercise.name,
                                      muscleGroup:
                                        workoutExercise.exercise.muscleGroup,
                                      // ensure caller context is preserved so returning
                                      // back to the workout retains routine and picker state
                                      fromPicker: false,
                                      returnRoute: "/workouts/new",
                                      routine: fromRoutine ?? undefined,
                                      fromNewRoutine:
                                        fromNewRoutineFlag ?? undefined,
                                    },
                                  });
                                } catch (e) {}
                              }}
                              trailing={
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
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
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
                            : ex,
                        ),
                      );
                    }}
                    className="w-full rounded-md border border-border bg-neutral-900/60 px-3 py-1 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                    rows={1}
                  />
                </div>

                <SetsHeader
                  muscleGroup={workoutExercise.exercise.muscleGroup}
                  exerciseName={workoutExercise.exercise.name}
                  logType={(workoutExercise.exercise as any).logType}
                />
                <div className="space-y-2">
                  {workoutExercise.sets.map((set, index) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      exerciseName={workoutExercise.exercise.name}
                      unit={set.unit || getUnit()}
                      setNumber={index + 1}
                      logType={(workoutExercise.exercise as any).logType}
                      readOnly={false}
                      unitInteractiveWhenReadOnly={false}
                      onUpdate={(updates) =>
                        updateSetLocal(workoutExercise.id, set.id, updates)
                      }
                      onUnitChange={(u) => {
                        updateSetLocal(workoutExercise.id, set.id, { unit: u });
                        setUnit(u);
                      }}
                      onComplete={() =>
                        workoutExercise.exercise.muscleGroup === "cardio"
                          ? toggleCardioSetComplete(workoutExercise.id, set.id)
                          : toggleSetComplete(workoutExercise.id, set.id)
                      }
                      useDialogForSetType
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
                            .id,
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
          <DialogContent
            hideClose
            className="fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[450px] max-h-[92vh] flex flex-col rounded-[32px] bg-zinc-900/90 backdrop-blur-xl border border-white/10 text-white px-6 pb-6 overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mt-3 mb-2" />

            <div className="sticky top-0 z-10 bg-transparent pt-1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsExerciseDialogOpen(false);
                    setExerciseSearch("");
                    setExerciseToReplace(null);
                  }}
                  className="text-sm text-muted-foreground"
                >
                  Cancel
                </button>

                <DialogTitle className="font-heading text-base font-semibold mx-auto">
                  {exerciseToReplace ? "Replace Exercise" : "Add Exercise"}
                </DialogTitle>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateExerciseOpen(true)}
                  className="hover:bg-transparent active:bg-transparent focus:bg-transparent"
                >
                  Create
                </Button>
              </div>

              <div className="relative mt-3">
                <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="pl-10 bg-zinc-950 text-sm focus:ring-1 focus:ring-orange-500 rounded-full"
                />
              </div>

              <div className="pt-3 overflow-x-hidden">
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 overflow-x-hidden">
                  <span className="text-sm text-muted-foreground mr-2 whitespace-nowrap">
                    Filter by:
                  </span>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 overflow-x-hidden">
                    <>
                      <div className="contents">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEquipmentPickerOpen(true);
                          }}
                          className={`flex items-center gap-2 min-w-0 max-w-full truncate px-2 sm:px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ease-out active:scale-95 active:opacity-80 ${
                            filterEquipment === "all"
                              ? "bg-zinc-900/80 border border-white/15 text-zinc-300 hover:bg-zinc-800/90 hover:border-white/20"
                              : "bg-zinc-800 border-white/25 text-white hover:bg-zinc-700 shadow-[0_6px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/8"
                          }`}
                        >
                          <span className="truncate">
                            {filterEquipment === "all"
                              ? "All Equipment"
                              : filterEquipment}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 ${filterEquipment === "all" ? "text-zinc-400" : "text-zinc-200"}`}
                          />
                        </button>
                      </div>

                      <Dialog
                        open={isEquipmentPickerOpen}
                        onOpenChange={(o) => setIsEquipmentPickerOpen(o)}
                      >
                        <DialogPortal>
                          <DialogContent
                            style={{ zIndex: 2147483647 }}
                            className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 mx-auto flex max-h-[65vh] w-[calc(100%-32px)] max-w-[480px] flex-col overflow-hidden px-4 pt-4 pb-5 rounded-3xl bg-neutral-950 backdrop-blur-none border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
                          >
                            <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/10 pt-3 pb-3">
                              <div className="w-14 h-1.5 bg-zinc-800/40 rounded-full mx-auto mb-3" />
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setIsEquipmentPickerOpen(false)
                                  }
                                  className="absolute right-0 top-0 h-7 w-7 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 text-sm font-medium transition-colors"
                                  aria-label="Close"
                                >
                                  ✕
                                </button>
                                <h3 className="text-center text-lg font-medium text-zinc-100">
                                  Equipment
                                </h3>
                              </div>
                            </div>
                            <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-1.5 overflow-y-auto bg-neutral-950">
                              <button
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                                  filterEquipment === "all"
                                    ? "bg-orange-500/10 border-l-2 border-orange-500 text-white"
                                    : "text-zinc-300 hover:bg-white/5"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilterEquipment("all");
                                  setIsEquipmentPickerOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-base font-medium truncate">
                                    All Equipment
                                  </span>
                                </div>
                                {filterEquipment === "all" ? (
                                  <span className="ml-3 text-zinc-200">✓</span>
                                ) : null}
                              </button>
                              {availableEquipments.map((opt) => {
                                const label = opt
                                  .split(" ")
                                  .map(
                                    (w) =>
                                      w[0]?.toUpperCase() +
                                      w.slice(1).toLowerCase(),
                                  )
                                  .join(" ");
                                const isSelected = filterEquipment === opt;
                                return (
                                  <button
                                    key={opt}
                                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${isSelected ? "bg-orange-500/10 border-l-2 border-orange-500 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFilterEquipment(opt as any);
                                      setIsEquipmentPickerOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="h-8 w-8 rounded-full bg-zinc-800/30 flex items-center justify-center flex-shrink-0">
                                        <img
                                          src={((): string => {
                                            const key = String(
                                              opt || "",
                                            ).toLowerCase();
                                            if (key.includes("barbell"))
                                              return "/icons/barbell.svg";
                                            if (key.includes("dumbbell"))
                                              return "/icons/dumbbell.svg";
                                            if (key.includes("kettlebell"))
                                              return "/icons/kettlebell.svg";
                                            if (key.includes("cable"))
                                              return "/icons/cable.svg";
                                            if (key.includes("machine"))
                                              return "/icons/machine.svg";
                                            if (key.includes("bodyweight"))
                                              return "/icons/bodyweight.svg";
                                            return "/icons/custom.svg";
                                          })()}
                                          alt={label + " icon"}
                                          className="h-4 w-4 opacity-70"
                                        />
                                      </div>
                                      <span className="text-base font-medium truncate">
                                        {label}
                                      </span>
                                    </div>
                                    {isSelected ? (
                                      <span className="ml-3 text-zinc-200">
                                        ✓
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </DialogContent>
                        </DialogPortal>
                      </Dialog>

                      <div className="contents">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMusclePickerOpen(true);
                          }}
                          className={`flex items-center gap-2 min-w-0 max-w-full truncate px-2 sm:px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ease-out active:scale-95 active:opacity-80 ${
                            filterMuscle === "all"
                              ? "bg-zinc-900/80 border border-white/15 text-zinc-300 hover:bg-zinc-800/90 hover:border-white/20"
                              : "bg-zinc-800 border-white/25 text-white hover:bg-zinc-700 shadow-[0_6px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/8"
                          }`}
                        >
                          <span className="truncate">
                            {filterMuscle === "all"
                              ? "All Muscles"
                              : filterMuscle}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 ${filterMuscle === "all" ? "text-zinc-400" : "text-zinc-200"}`}
                          />
                        </button>
                      </div>

                      <Dialog
                        open={isMusclePickerOpen}
                        onOpenChange={(o) => setIsMusclePickerOpen(o)}
                      >
                        <DialogPortal>
                          <DialogContent
                            style={{ zIndex: 2147483647 }}
                            className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 mx-auto flex max-h-[65vh] w-[calc(100%-32px)] max-w-[480px] flex-col overflow-hidden px-4 pt-4 pb-5 rounded-3xl bg-neutral-950 backdrop-blur-none border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
                          >
                            <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/10 pt-3 pb-3">
                              <div className="w-12 h-1 bg-zinc-800/50 rounded-full mx-auto mb-3" />
                              <div className="relative">
                                <button
                                  onClick={() => setIsMusclePickerOpen(false)}
                                  className="absolute right-0 top-0 h-7 w-7 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 text-sm font-medium transition-colors"
                                  aria-label="Close"
                                >
                                  ✕
                                </button>
                                <h3 className="text-center text-xl font-semibold text-zinc-100">
                                  Muscles
                                </h3>
                              </div>
                            </div>
                            <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-1.5 overflow-y-auto bg-neutral-950">
                              <button
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${filterMuscle === "all" ? "bg-orange-500/10 border-l-2 border-orange-500 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilterMuscle("all");
                                  setIsMusclePickerOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-base font-medium truncate">
                                    All Muscles
                                  </span>
                                </div>
                                {filterMuscle === "all" ? (
                                  <span className="ml-3 text-zinc-200">✓</span>
                                ) : null}
                              </button>
                              {availableMuscles
                                .filter((m) => m !== "other")
                                .map((opt) => {
                                  const label = opt
                                    .split(" ")
                                    .map(
                                      (w) =>
                                        w[0]?.toUpperCase() +
                                        w.slice(1).toLowerCase(),
                                    )
                                    .join(" ");
                                  const isSelected = filterMuscle === opt;
                                  const color =
                                    (muscleGroupColors as any)[opt as any] ||
                                    "bg-slate-500/20 text-slate-400";
                                  return (
                                    <button
                                      key={opt}
                                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${isSelected ? "bg-orange-500/10 border-l-2 border-orange-500 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFilterMuscle(opt);
                                        setIsMusclePickerOpen(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span
                                          className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${color}`}
                                        />
                                        <span className="text-base font-medium truncate">
                                          {label}
                                        </span>
                                      </div>
                                      {isSelected ? (
                                        <span className="ml-3 text-zinc-200">
                                          ✓
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                            </div>
                          </DialogContent>
                        </DialogPortal>
                      </Dialog>
                    </>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex-1 min-h-0 max-h-[65vh] overflow-y-auto pb-6">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No such exercise available
                  </p>
                  <div className="mt-4">
                    <Button
                      onClick={() => setIsCreateExerciseOpen(true)}
                      className="hover:bg-transparent active:bg-transparent focus:bg-transparent"
                    >
                      Create Exercise
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="flex w-full items-center border-b border-white/5 min-w-0"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const currentExerciseToReplace = exerciseToReplace;
                          if (currentExerciseToReplace) {
                            try {
                              localStorage.setItem(
                                "workout:exerciseToReplace",
                                currentExerciseToReplace,
                              );
                            } catch {}
                          }
                          setExerciseSearch("");
                          navigate(`/exercises/${exercise.id}/info`, {
                            state: {
                              fromPicker: true,
                              returnRoute: "/workouts/new",
                              exerciseName: exercise.name,
                              muscleGroup: exercise.muscleGroup,
                              exerciseToReplace:
                                currentExerciseToReplace ?? null,
                              routine: fromRoutine ?? undefined,
                              fromNewRoutine: fromNewRoutineFlag ?? undefined,
                            },
                          });
                        }}
                        className="flex flex-1 min-w-0 items-center gap-4 py-4 text-left transition-colors hover:bg-white/2"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-zinc-800 rounded-md border border-white/10">
                          <img
                            src={`/icons/${getExerciseIconFile(exercise.name, exercise.muscleGroup, (exercise as any).custom)}`}
                            alt={exercise.name}
                            className="h-10 w-10 object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {exercise.name}
                          </p>
                          {(() => {
                            const normalizedGroup =
                              exercise.muscleGroup === "other" &&
                              exercise.name.toLowerCase().includes("calf")
                                ? "calves"
                                : exercise.muscleGroup;
                            return <MuscleTag muscle={normalizedGroup} />;
                          })()}
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-label={
                          exerciseToReplace
                            ? "Replace exercise"
                            : "Add exercise"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            if (exerciseToReplace) {
                              replaceExerciseForCard(
                                exerciseToReplace,
                                exercise,
                              );
                            } else {
                              addExercise(exercise);
                            }
                          } catch (err) {
                            console.error("add/replace exercise failed:", err);
                          }
                        }}
                        className="flex items-center justify-center px-4 py-4 text-muted-foreground hover:text-white transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="h-6" />
            </div>
          </DialogContent>
        </Dialog>

        <CreateExerciseDialog
          isOpen={isCreateExerciseOpen}
          onOpenChange={setIsCreateExerciseOpen}
          newExerciseName={newExerciseName}
          setNewExerciseName={setNewExerciseName}
          newExerciseEquipment={newExerciseEquipment}
          setNewExerciseEquipment={setNewExerciseEquipment}
          availableEquipments={availableEquipments}
          isEquipmentPickerOpen={isCreateEquipmentPickerOpen}
          onEquipmentPickerOpenChange={setIsCreateEquipmentPickerOpen}
          newExerciseMuscle={newExerciseMuscle}
          setNewExerciseMuscle={setNewExerciseMuscle}
          availableMuscles={availableMuscles}
          isMusclePickerOpen={isCreateMusclePickerOpen}
          onMusclePickerOpenChange={setIsCreateMusclePickerOpen}
          newExerciseDescription={newExerciseDescription}
          setNewExerciseDescription={setNewExerciseDescription}
          onSubmit={() => createExerciseMutation.mutate()}
          isSubmitting={createExerciseMutation.isLoading}
          isValidationOpen={isCreateValidationOpen}
          onValidationOpenChange={setIsCreateValidationOpen}
          validationMessage={createValidationMessage}
          newExerciseLogType={newExerciseLogType}
          setNewExerciseLogType={setNewExerciseLogType}
        />
      </div>
    </AppLayout>
  );
}
