import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogPortal,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Clock,
  Save,
  ChevronDown,
  Trash2,
  Plus,
  ChevronRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createWorkout,
  createSet,
  updateSet,
  createCardioSet,
  updateCardioSet,
  finishWorkout,
  getCardioSetsForWorkout,
  getExercises,
  getSetsForExercise,
  getWorkouts,
  createExercise,
  getToken,
} from "@/lib/api";
import { recommendNextRoutine } from "@/lib/onboarding";
import { triggerHaptic } from "@/lib/haptics";
import { getUnit, countPrTypesFromSet } from "@/lib/utils";
import { libraryExercises as staticLibraryExercises } from "@/data/libraryExercises";
import { CreateExerciseDialog } from "@/components/workout/CreateExerciseDialog";
import type {
  CardioMode,
  Exercise,
  MuscleGroup,
  Routine,
  WorkoutExercise,
  WorkoutSet,
} from "@/types/workout";

// Grid templates used by headers and set-row layouts
const GRID_TEMPLATE_STRENGTH =
  "minmax(20px, 0.23fr) minmax(50px, 0.65fr) 6px minmax(20px, 0.65fr) minmax(25px, 0.25fr) 32px 30px";
// Cardio: Set type | Time | Dist/Floors | Level/Split | PR | Check (tightened)
const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.2fr) minmax(56px, 0.5fr) minmax(56px, 0.65fr) minmax(28px, 0.25fr) 32px 30px";

// HIIT / bodyweight cardio layout: Set type | Time | Reps | RPE | PR | Check
const GRID_TEMPLATE_HIIT =
  "minmax(20px, 0.23fr) minmax(60px, 0.65fr) minmax(22px, 0.65fr) minmax(28px, 0.3fr) 32px 30px";

// consistent friendly muscle ordering used across library and create dialogs
const allMusclesOrder: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "calves",
  "core",
  "cardio",
];

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
  const isRoutineBuilder = !!location.state?.fromNewRoutine;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState<string>(
    fromRoutine?.name || "Workout",
  );
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
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
  const [replaceFilter, setReplaceFilter] = useState<string | null>(null);

  const [unusualSet, setUnusualSet] = useState<UnusualSetState | null>(null);
  const recentForced = useRef<Set<string>>(new Set());

  const [exerciseInfoOpen, setExerciseInfoOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>();

  const [startedFromRoutine] = useState<boolean>(
    !!fromRoutine || !!location.state?.fromNewRoutine,
  );

  const headerRef = useRef<HTMLDivElement | null>(null);

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
        { custom: true },
      ),
    onSuccess: (created: any) => {
      try {
        queryClient.invalidateQueries({ queryKey: ["exercises"] });
      } catch (e) {}
      try {
        if (replaceTarget) replaceExercise(replaceTarget, created);
        else addExercise(created);
      } catch (e) {}
      setIsCreateExerciseOpen(false);
      setIsExerciseDialogOpen(false);
      setNewExerciseName("");
      setNewExerciseMuscle("");
      setNewExerciseEquipment("all");
      setNewExerciseDescription("");
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

  type UnusualSetState =
    | {
        type: "history";
        exerciseId: string;
        setId: string;
        previousBestText: string;
        newSetText: string;
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
      const w = await createWorkout(name);
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
            if (parsed.exercises) setExercises(parsed.exercises);
            if (typeof parsed.elapsedSec === "number")
              setElapsedSec(parsed.elapsedSec);
            if (parsed.startTime) {
              const dt = new Date(parsed.startTime);
              if (!isNaN(dt.getTime())) setStartTime(dt);
            }
            if (parsed.workoutName) setWorkoutName(parsed.workoutName);
            if (parsed.notes) setNotes(parsed.notes);
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
  }, [workoutId, workoutName, isRoutineBuilder]);

  useEffect(() => {
    if (!workoutId || isRoutineBuilder) return;
    try {
      localStorage.setItem(
        `workout:state:${workoutId}`,
        JSON.stringify({
          exercises,
          elapsedSec,
          workoutName,
          notes,
          startTime,
        }),
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
      dt.getDate(),
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
          }),
        );
        // If this session was started from a routine, keep it paused; otherwise clear paused flag
        if (!startedFromRoutine) {
          localStorage.removeItem("workout:paused");
        }
      } catch (e) {}
    }
  }, [workoutId, isRoutineBuilder]);

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
    // Debug: log equipment filter and sample mismatches when a non-'all' filter is active
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
        // When filtering for cardio, also include HIIT/bodyweight exercises
        // whose muscleGroup might not be labeled as "cardio" but are
        // commonly used as HIIT (burpees, mountain climbers, etc.).
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

  // PR banner queue handling (mirrors EditWorkout/Workouts)
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

  const setStartDateOnly = (date: Date) => {
    const dt = new Date(startTime);
    dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setStartTime(dt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate(),
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
                      getCardioModeForExercise(ex.exercise))
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

      const isPersisted = /^\d+$/.test(String(set.id));
      const payload = {
        reps: set.reps,
        halfReps: (set as any).halfReps || 0,
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
            allWorkouts.filter((w) => !!w.endedAt).map((w) => String(w.id)),
          );
          completedSets = priorSets.filter((ps) =>
            finished.has(String(ps.workout)),
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

      // Compute new-set metrics and determine whether to show the
      // confirmation dialog. Relative comparison remains the primary
      // trigger (requires prior history and not forced). Absolute
      // thresholds are a fail-safe and should trigger regardless of
      // history.
      {
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

        const relativeTrigger =
          hadPrior && !force && ratio >= UNUSUAL_THRESHOLD;

        // Absolute thresholds act as a secondary safety layer. They do not
        // replace the relative comparison; they only trigger the same
        // confirmation dialog when an entry is implausibly large.
        const absoluteWeightTrigger = newKg > 500; // kg per set
        const absoluteVolumeTrigger = newVolumeKg > 10000; // kg * reps per set
        const absoluteTrigger = absoluteWeightTrigger || absoluteVolumeTrigger;

        // Temporary debug logs to validate values during testing.
        // Remove these once verified.
        // eslint-disable-next-line no-console
        console.log("unusual-set-check", {
          weightKg: newKg,
          reps: newReps,
          setVolume: newVolumeKg,
          relativeTrigger,
          absoluteTrigger,
        });

        if (relativeTrigger || absoluteTrigger) {
          // If the user recently forced this set (confirmed), do not re-open the dialog.
          if (recentForced.current.has(setId)) {
            // clear the marker and continue saving
            recentForced.current.delete(setId);
          } else {
            // Revert the optimistic completion toggle so the user stays in edit mode.
            setExercises((prev) =>
              prev.map((e) =>
                e.id === exerciseId
                  ? {
                      ...e,
                      sets: e.sets.map((s) =>
                        s.id === setId ? { ...s, completed: false } : s,
                      ),
                    }
                  : e,
              ),
            );

            const prevSummary =
              bestVolumeKg > 0
                ? `${bestVolumeKg.toFixed(1)} kg volume (approx.)`
                : best1rmKg > 0
                  ? `${best1rmKg.toFixed(1)} kg est. 1RM`
                  : null;

            const newSummary =
              newKg > 0 && newReps > 0
                ? `${newKg.toFixed(1)} kg x ${newReps} reps`
                : "Current entry has no load/reps";

            // Branch the dialog type in the validation layer:
            // history-based anomaly when previous data exists
            // first-time extreme entry when no prior data is available
            if (hadPrior) {
              setUnusualSet({
                type: "history",
                exerciseId,
                setId,
                previousBestText: prevSummary ?? "Previous best unknown",
                newSetText: newSummary,
              });
            } else {
              setUnusualSet({
                type: "firstTime",
                exerciseId,
                setId,
                previousBestText: null,
                newSetText: newSummary,
                weightKg: newKg,
                reps: newReps,
              });
            }
          }
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
                    : s,
                ),
              },
        ),
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
    const ex = exercises.find((e) => e.id === exerciseId);
    const set = ex?.sets.find((s) => s.id === setId);
    if (!ex || !set) return;

    const isStrengthLike = ex.exercise.muscleGroup !== "cardio";

    // For non-cardio exercises, delegate to the regular strength logging path
    // so sets are stored via createSet/updateSet. Cardio (including HIIT
    // bodyweight cardio) uses the dedicated cardio endpoints so duration is
    // always persisted.
    if (isStrengthLike) {
      await toggleSetComplete(exerciseId, setId);
      return;
    }

    // Pure cardio flow: optimistically toggle locally, then persist via
    // cardio endpoints once the set is marked complete.
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
        set.cardioMode || getCardioModeForExercise(ex.exercise) || "treadmill";

      const isPersisted = /^\d+$/.test(String(set.id));

      const durationSeconds = set.cardioDurationSeconds ?? 0;
      const rawDistance = set.cardioDistance ?? 0;
      const rawStatBase = set.cardioStat ?? 0;

      // For HIIT/bodyweight cardio, treat the generic "stat" field as reps so
      // we can persist rep counts via the cardio schema.
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

      // Map generic UI stats to backend metrics per mode
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
          // For HIIT/bodyweight cardio, stash reps in the `floors` field so
          // we avoid DecimalField limits on `level` while still persisting
          // large rep counts. The treadmill/bike/elliptical PR logic ignores
          // `floors`, so this is safe.
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
          // compute next set number for this workout+exercise to avoid uniqueness errors
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
                    ? {
                        ...e,
                        exercise: { ...e.exercise, id: createdEx.id },
                      }
                    : e,
                ),
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

          // compute next set number for this workout+exercise to avoid duplicates
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
                    : s,
                ),
              },
        ),
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
      }),
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

      // Pre-fetch finished workout ids to determine prior history for PR eligibility
      let finishedWorkoutIds = new Set<string>();
      try {
        const allWorkouts = await getWorkouts();
        finishedWorkoutIds = new Set(
          allWorkouts.filter((w) => !!w.endedAt).map((w) => String(w.id)),
        );
      } catch (e) {
        // ignore, fallback per-exercise
      }

      // Prefetch existing cardio sets for this workout so we can allocate
      // monotonically increasing set numbers per exercise locally. This
      // prevents races/duplicates when creating multiple cardio sets
      // in the same save flow.
      const cardioMaxByExercise: Record<string, number> = {};
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
        });
      } catch (e) {
        // ignore and start counters at 0
      }

      for (const ex of exercisesToPersist) {
        // determine if this exercise has appeared in any previously finished workout
        let hadPriorForExercise = false;
        try {
          const priorSets = await getSetsForExercise(String(ex.exercise.id));
          if (finishedWorkoutIds.size > 0) {
            hadPriorForExercise = priorSets.some((ps) =>
              finishedWorkoutIds.has(ps.workout),
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
              const rawStatBase = s.cardioStat ?? 0;

              const isHiitName = (ex?.exercise?.name || "")
                .toLowerCase()
                .match(/burpee|mountain|climb|jump squat|plank jack|skater/);
              const rawStat = isHiitName ? s.reps || 0 : rawStatBase;

              let distance: number | undefined;
              let floors: number | undefined;
              let level: number | undefined;
              let splitSeconds: number | undefined;

              if (mode === "stairs") {
                // For stairs, allow floors (count) or meters (vertical meters)
                const distUnit =
                  (s as any).cardioDistanceUnit === "m" ? "m" : "flr";
                if (distUnit === "m") {
                  distance = rawDistance || undefined; // meters
                } else {
                  floors = rawDistance || undefined; // floor count
                }
                level = rawStat || undefined;
              } else if (mode === "row") {
                distance = rawDistance || undefined;
                splitSeconds = rawStat || undefined;
              } else {
                distance = rawDistance || undefined;
                // For HIIT cardio, stash reps in `floors` so we avoid
                // DecimalField limits on `level`.
                if (isHiitName) {
                  floors = s.reps || 0 || undefined;
                  level = undefined;
                } else {
                  level = rawStat || undefined;
                }
              }

              // allocate a set number from our local per-exercise counter
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

              // If the exercise name is a HIIT/bodyweight type and the set has reps,
              // create a strength set so reps/RPE persist and are visible in the UI.
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
                    // rawDistance is already meters
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

                // allocate the retry set number from our local counter as well
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
          String(minutes),
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

      // Post-workout first-time completion flow
      try {
        const firstDone = localStorage.getItem("user:firstWorkoutCompleted");
        if (!firstDone) {
          try {
            localStorage.setItem("user:firstWorkoutCompleted", "1");
          } catch (e) {}

          let suggested = null as any;
          try {
            if (fromRoutine && fromRoutine.id) {
              suggested = recommendNextRoutine(fromRoutine.id);
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
            navigate("/workouts/complete", {
              state: {
                suggestedRoutine: suggested?.routine,
                label: suggested?.label,
              },
            });
            try {
              localStorage.removeItem("workout:inProgress");
              localStorage.removeItem("workout:paused");
            } catch (e) {}
            return;
          } catch (e) {}
        }
      } catch (e) {}

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHeaderHeight = () => {
      if (!headerRef.current) return;
      const height = headerRef.current.offsetHeight || 0;
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(
          "--workout-header-h",
          `${height}px`,
        );
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, []);

  return (
    <AppLayout>
      {/* PR banner (stays below fixed action bar) */}
      <div className="pointer-events-none fixed left-1/2 top-[72px] z-40 -translate-x-1/2 flex justify-center w-full px-4">
        <div
          className={`pointer-events-auto flex items-center gap-3 rounded-full bg-zinc-800 px-4 py-2 shadow-md shadow-black/30 border border-white/25 ring-1 ring-white/5 max-w-xs sm:max-w-md transition-all duration-300 ease-out transform ${
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

      {/* Fixed top action bar for Cancel / Save (replaces global header) */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-40 bg-zinc-900 border-b border-white/10 shadow-sm shadow-black/30 pt-6 pb-2"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(isRoutineBuilder ? "/routines" : "/workouts")
            }
          >
            Cancel
          </Button>
          <Button size="sm" onClick={saveWorkout}>
            {isRoutineBuilder ? "Save Routine" : "Save Workout"}
          </Button>
        </div>
      </div>

      <div
        className="space-y-6"
        style={{ paddingTop: "var(--workout-header-h, 0px)" }}
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
                  <DialogTitle>Review set entry</DialogTitle>
                  <DialogDescription>
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
                        <dd className="mt-1 text-sm text-white truncate">
                          {unusualSet.previousBestText}
                        </dd>
                      </div>

                      <div className="flex flex-col">
                        <dt className="text-xs font-medium text-muted-foreground">
                          Current entry
                        </dt>
                        <dd className="mt-1 text-sm text-white truncate">
                          {unusualSet.newSetText}
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
                          // mark this set as recently forced so detection won't re-open
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
                              onClick={() => {
                                try {
                                  const exId = String(
                                    workoutExercise.exercise.id,
                                  );
                                  navigate(`/exercises/${exId}/history`, {
                                    state: {
                                      exerciseName:
                                        workoutExercise.exercise.name,
                                      muscleGroup:
                                        workoutExercise.exercise.muscleGroup,
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
                      {/** moved chevron into ExerciseHeader trailing prop */}
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
                            : ex,
                        ),
                      );
                    }}
                    className="w-full rounded-md border border-border bg-neutral-900/60 px-3 py-1 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                    rows={1}
                  />
                </div>

                {/* Sets Header */}
                {workoutExercise.exercise.muscleGroup === "cardio" ? (
                  (() => {
                    const name = (
                      workoutExercise.exercise.name || ""
                    ).toLowerCase();
                    const isHiit =
                      name.includes("burpee") ||
                      name.includes("mountain") ||
                      name.includes("climb") ||
                      name.includes("jump squat") ||
                      name.includes("plank jack") ||
                      name.includes("skater");

                    return (
                      <div
                        className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
                        style={{
                          gridTemplateColumns: isHiit
                            ? GRID_TEMPLATE_HIIT
                            : GRID_TEMPLATE_CARDIO,
                        }}
                      >
                        <span className="flex items-center justify-center text-center translate-x-[2px]">
                          SET
                        </span>

                        <span className="flex items-center justify-center text-center">
                          DURATION
                        </span>

                        {isHiit ? (
                          <span className="flex items-center justify-center text-center">
                            REPS
                          </span>
                        ) : (
                          <span className="flex items-center justify-center text-center">
                            {getCardioModeForExercise(
                              workoutExercise.exercise,
                            ) === "stairs"
                              ? "CLIMB"
                              : "DISTANCE"}
                          </span>
                        )}

                        {isHiit ? (
                          <span className="flex items-center justify-center text-center">
                            RPE
                          </span>
                        ) : (
                          <span className="flex items-center justify-center text-center">
                            {(() => {
                              const mode = getCardioModeForExercise(
                                workoutExercise.exercise,
                              );
                              if (mode === "treadmill") return "INCLINE";
                              if (mode === "row") return "SPLIT TIME";
                              return "LEVEL";
                            })()}
                          </span>
                        )}

                        <span className="flex items-center justify-center text-center">
                          <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
                        </span>

                        <div />
                      </div>
                    );
                  })()
                ) : (
                  <div
                    className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
                    style={{ gridTemplateColumns: GRID_TEMPLATE_STRENGTH }}
                  >
                    {/* Column 1: SET */}
                    <span className="flex items-center justify-center text-center translate-x-[2px]">
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
                      <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
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
            {/* Grab handle */}
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
                          className={`flex items-center gap-2 min-w-0 max-w-full truncate px-2 sm:px-3 py-1.5 rounded-full text-sm border transition-all duration-300 ease-in-out active:scale-95 active:opacity-80 ${
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
                            style={{
                              zIndex: 2147483647,
                            }}
                            className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 mx-auto w-[calc(100%-32px)] max-w-[480px] max-h-[65vh] overflow-y-auto px-4 pt-4 pb-5 rounded-3xl bg-neutral-950 border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
                          >
                            <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/10 pt-3 pb-3">
                              <div className="w-14 h-1.5 bg-zinc-800/40 rounded-full mx-auto mb-3" />
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setIsEquipmentPickerOpen(false)
                                  }
                                  className="absolute right-3 top-0 text-zinc-400 hover:text-zinc-200"
                                  aria-label="Close"
                                >
                                  ×
                                </button>
                                <h3 className="text-center text-lg font-medium text-zinc-100">
                                  Equipment
                                </h3>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-col space-y-1.5">
                              <button
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                                  filterEquipment === "all"
                                    ? "bg-white/5 text-white"
                                    : "text-zinc-300 hover:bg-white/3"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilterEquipment("all");
                                  setIsEquipmentPickerOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-8 w-8 rounded-full bg-zinc-800/30 flex items-center justify-center flex-shrink-0">
                                    <img
                                      src="/icons/custom.svg"
                                      alt="All Equipment icon"
                                      className="h-4 w-4 opacity-70"
                                    />
                                  </div>
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
                                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                                      isSelected
                                        ? "bg-white/5 text-white"
                                        : "text-zinc-300 hover:bg-white/3"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFilterEquipment(opt as any);
                                      setIsEquipmentPickerOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* equipment icon */}
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
                          className={`flex items-center gap-2 min-w-0 max-w-full truncate px-2 sm:px-3 py-1.5 rounded-full text-sm border transition-all duration-300 ease-in-out active:scale-95 active:opacity-80 ${
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
                            style={{
                              zIndex: 2147483647,
                            }}
                            className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 mx-auto w-[calc(100%-32px)] max-w-[480px] max-h-[65vh] overflow-y-auto px-4 pt-4 pb-5 rounded-3xl bg-neutral-950 border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
                          >
                            <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/10 pt-3 pb-3">
                              <div className="w-12 h-1 bg-zinc-800/50 rounded-full mx-auto mb-3" />
                              <div className="relative">
                                <button
                                  onClick={() => setIsMusclePickerOpen(false)}
                                  className="absolute right-3 top-0 text-zinc-400 hover:text-zinc-200"
                                  aria-label="Close"
                                >
                                  ×
                                </button>
                                <h3 className="text-center text-xl font-semibold text-zinc-100">
                                  Muscles
                                </h3>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-col space-y-1.5">
                              <button
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                                  filterMuscle === "all"
                                    ? "bg-white/5 text-white"
                                    : "text-zinc-300 hover:bg-white/3"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilterMuscle("all");
                                  setIsMusclePickerOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-8 w-8 rounded-full bg-zinc-800/30 flex items-center justify-center flex-shrink-0">
                                    <img
                                      src="/icons/custom.svg"
                                      alt="All Muscles icon"
                                      className="h-4 w-4 opacity-70"
                                    />
                                  </div>
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
                                  const color =
                                    (muscleGroupColors as any)[opt as any] ||
                                    "bg-slate-500/20 text-slate-400";
                                  return (
                                    <button
                                      key={opt}
                                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                                        filterMuscle === opt
                                          ? "bg-white/5 text-white"
                                          : "text-zinc-300 hover:bg-white/3"
                                      }`}
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
                                      {filterMuscle === opt ? (
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
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={(e) => {
                        console.log("exercise clicked:", exercise.name);
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          if (exerciseToReplace) {
                            replaceExerciseForCard(exerciseToReplace, exercise);
                          } else {
                            addExercise(exercise);
                          }
                        } catch (err) {
                          // surface runtime errors to console for debugging
                          console.error("add/replace exercise failed:", err);
                        }
                      }}
                      className="flex w-full items-center gap-4 py-4 text-left transition-colors border-b border-white/5 hover:bg-white/2"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-zinc-800 rounded-md border border-white/10">
                        <img
                          src={`/icons/${getExerciseIconFile(exercise.name, exercise.muscleGroup)}`}
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
              <div className="h-6" />
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Exercise dialog (global for this page) */}
        {isCreateExerciseOpen && (
          <div
            className="fixed inset-0"
            style={{
              zIndex: 109,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              background: "rgba(0,0,0,0.35)",
            }}
            onClick={() => setIsCreateExerciseOpen(false)}
            aria-hidden
          />
        )}

        <Dialog
          open={isCreateExerciseOpen}
          onOpenChange={setIsCreateExerciseOpen}
        >
          <DialogContent className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 w-[94vw] max-w-[400px] sm:w-[90vw] sm:max-w-[420px] rounded-[32px] bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-4 py-4 sm:px-6 sm:py-6">
            <div className="text-center">
              <DialogTitle className="text-lg font-semibold">
                Create Exercise
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Add a new exercise to your library
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="create-name">Exercise Name</Label>
                <Input
                  id="create-name"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="e.g., Incline Dumbbell Press"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="whitespace-nowrap">Equipment:</Label>
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreateEquipmentPickerOpen(true);
                    }}
                    className={`flex items-center gap-2 max-w-[12rem] truncate px-3 py-1.5 rounded-full text-sm border transition-all duration-150 ease-out active:scale-[0.97] ${
                      newExerciseEquipment === "all"
                        ? "bg-zinc-900/80 border border-white/15 text-zinc-300 hover:bg-zinc-800/90 hover:border-white/20"
                        : "bg-zinc-800 border-white/25 text-white hover:bg-zinc-700 shadow-[0_6px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/8"
                    }`}
                  >
                    <span className="truncate">
                      {newExerciseEquipment === "all"
                        ? "All Equipment"
                        : newExerciseEquipment}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 ${newExerciseEquipment === "all" ? "text-zinc-400" : "text-zinc-200"}`}
                    />
                  </button>

                  <Dialog
                    open={isCreateEquipmentPickerOpen}
                    onOpenChange={(o) => setIsCreateEquipmentPickerOpen(o)}
                  >
                    <DialogPortal>
                      <DialogContent
                        style={{
                          zIndex: 2147483647,
                          boxShadow: "0 -12px 28px rgba(0,0,0,0.65)",
                        }}
                        className="picker-drawer fixed left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 bottom-auto mx-auto w-[calc(100%-32px)] max-w-[480px] p-3 bg-neutral-950 border border-white/8 rounded-t-3xl max-h-[65vh] overflow-y-auto pb-4 data-[state=open]:opacity-100 data-[state=open]:animate-none data-[state=closed]:animate-none"
                      >
                        <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/6 pt-3 pb-3">
                          <div className="w-14 h-1.5 bg-zinc-800/40 rounded-full mx-auto mb-3" />
                          <div className="relative">
                            <button
                              onClick={() =>
                                setIsCreateEquipmentPickerOpen(false)
                              }
                              className="absolute right-3 top-0 text-zinc-400 hover:text-zinc-200"
                              aria-label="Close"
                            >
                              ×
                            </button>
                            <h3 className="text-center text-lg font-medium text-zinc-100">
                              Equipment
                            </h3>
                          </div>
                        </div>
                        <div className="space-y-2 px-1">
                          <button
                            className={`w-full text-left px-4 py-3 rounded-md transition-colors hover:bg-white/5 ${newExerciseEquipment === "all" ? "bg-zinc-800/70 text-white" : "text-zinc-200"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewExerciseEquipment("all");
                              setIsCreateEquipmentPickerOpen(false);
                            }}
                          >
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-zinc-800/40 flex items-center justify-center mr-3">
                                <img
                                  src="/icons/custom.svg"
                                  alt="All Equipment icon"
                                  className="h-4 w-4"
                                />
                              </div>
                              <span className="text-base font-medium">
                                All Equipment
                              </span>
                            </div>
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
                            const isSelected = newExerciseEquipment === opt;
                            return (
                              <button
                                key={opt}
                                className={`w-full text-left px-4 py-3 rounded-md transition-colors hover:bg-white/5 ${isSelected ? "bg-zinc-800/70 text-white" : "text-zinc-200"}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewExerciseEquipment(opt as any);
                                  setIsCreateEquipmentPickerOpen(false);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-full bg-zinc-800/40 flex items-center justify-center flex-shrink-0 mr-3">
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
                                        className="h-4 w-4"
                                      />
                                    </div>
                                    <span className="text-base font-medium truncate">
                                      {label}
                                    </span>
                                  </div>
                                  {isSelected ? (
                                    <span className="text-zinc-200">✓</span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </DialogContent>
                    </DialogPortal>
                  </Dialog>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 mt-4">
                <Label className="whitespace-nowrap">Muscle group:</Label>
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreateMusclePickerOpen(true);
                    }}
                    className={`flex items-center gap-2 max-w-[12rem] truncate px-3 py-1.5 rounded-full text-sm border transition-all duration-150 ease-out active:scale-[0.97] ${
                      !newExerciseMuscle
                        ? "bg-zinc-900/80 border border-white/15 text-zinc-300 hover:bg-zinc-800/90 hover:border-white/20"
                        : "bg-zinc-800 border-white/25 text-white hover:bg-zinc-700 shadow-[0_6px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/8"
                    }`}
                  >
                    <span className="truncate">
                      {newExerciseMuscle
                        ? newExerciseMuscle
                        : "Select muscle group"}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 ${!newExerciseMuscle ? "text-zinc-400" : "text-zinc-200"}`}
                    />
                  </button>

                  <Dialog
                    open={isCreateMusclePickerOpen}
                    onOpenChange={(o) => setIsCreateMusclePickerOpen(o)}
                  >
                    <DialogPortal>
                      <DialogContent
                        style={{
                          zIndex: 2147483647,
                          boxShadow: "0 -12px 28px rgba(0,0,0,0.65)",
                        }}
                        className="picker-drawer fixed left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 bottom-auto mx-auto w-[calc(100%-32px)] max-w-[480px] p-3 bg-neutral-950 border border-white/6 rounded-t-3xl max-h-[65vh] overflow-y-auto pb-4 data-[state=open]:opacity-100 data-[state=open]:animate-none data-[state=closed]:animate-none"
                      >
                        <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/6 pt-3 pb-3">
                          <div className="w-12 h-1 bg-zinc-800/50 rounded-full mx-auto mb-3" />
                          <div className="relative">
                            <button
                              onClick={() => setIsCreateMusclePickerOpen(false)}
                              className="absolute right-3 top-0 text-zinc-400 hover:text-zinc-200"
                              aria-label="Close"
                            >
                              ×
                            </button>
                            <h3 className="text-center text-xl font-semibold text-zinc-100">
                              Muscles
                            </h3>
                          </div>
                        </div>
                        <div className="space-y-2 px-1">
                          <button
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewExerciseMuscle("");
                              setIsCreateMusclePickerOpen(false);
                            }}
                          >
                            <span className="text-lg text-zinc-200">
                              All Muscles
                            </span>
                          </button>
                          {availableMuscles
                            .filter((m) => m !== "other")
                            .map((opt) => (
                              <button
                                key={opt}
                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewExerciseMuscle(opt);
                                  setIsCreateMusclePickerOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${muscleGroupColors[opt as MuscleGroup] ?? "bg-zinc-800/30 text-zinc-200"}`}
                                  >
                                    {opt[0]?.toUpperCase() + opt.slice(1)}
                                  </span>
                                </div>
                              </button>
                            ))}
                        </div>
                      </DialogContent>
                    </DialogPortal>
                  </Dialog>
                </div>
              </div>

              <div>
                <Label htmlFor="create-desc">Description (optional)</Label>
                <Textarea
                  id="create-desc"
                  value={newExerciseDescription}
                  onChange={(e) => setNewExerciseDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateExerciseOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateExercise}
                disabled={createExerciseMutation.isLoading}
              >
                {createExerciseMutation.isLoading ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Validation dialog shown when required create fields missing */}
        <Dialog
          open={isCreateValidationOpen}
          onOpenChange={(o) => setIsCreateValidationOpen(o)}
        >
          <DialogContent className="max-w-[360px] rounded-[16px] bg-zinc-900 border border-white/10 text-white p-4">
            <DialogTitle className="text-base font-semibold">
              Missing information
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {createValidationMessage}
            </DialogDescription>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateValidationOpen(false)}
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
