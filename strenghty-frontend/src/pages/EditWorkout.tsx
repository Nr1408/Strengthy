// In EditWorkout.tsx (or ViewWorkout.tsx)
const GRID_TEMPLATE =
  "minmax(20px, 0.23fr) minmax(50px, 0.65fr) 6px minmax(20px, 0.65fr) minmax(25px, 0.25fr) 32px 30px";

// Cardio: Set type | Time | Dist/Floors | Level/Split | PR | Check (tightened)
const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.2fr) minmax(56px, 0.5fr) minmax(56px, 0.65fr) minmax(28px, 0.25fr) 32px 30px";

// HIIT / bodyweight cardio layout: Set type | Time | Reps | RPE | PR | Check
const GRID_TEMPLATE_HIIT =
  "minmax(20px, 0.23fr) minmax(60px, 0.65fr) minmax(22px, 0.65fr) minmax(28px, 0.3fr) 32px 30px";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  deleteCardioSet,
  getSets,
  getExercises,
  getSetsForExercise,
  getWorkouts,
  createExercise,
  getToken,
  updateWorkout,
  deleteSet,
} from "@/lib/api";
import { recommendNextRoutine } from "@/lib/onboarding";
import { getUnit, formatMinutes } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { libraryExercises as staticLibraryExercises } from "@/data/libraryExercises";
import { CreateExerciseDialog } from "@/components/workout/CreateExerciseDialog";

export default function EditWorkout() {
  const navigate = useNavigate();
  const params = useParams();
  const workoutId = (params as any)?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // create exercise state for inline creation
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<string | "">("");
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<
    "all" | string
  >("all");
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
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

  // Validation modal for create exercise
  const [isCreateValidationOpen, setIsCreateValidationOpen] = useState(false);
  const [createValidationMessage, setCreateValidationMessage] =
    useState<string>("");

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

  const hasToken = typeof window !== "undefined" && !!getToken();

  const { data: userExercises = [] } = useQuery({
    queryKey: ["exercises", hasToken],
    queryFn: getExercises,
    enabled: hasToken,
  });

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
  const [workoutName, setWorkoutName] = useState<string>("Workout");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [unusualSet, setUnusualSet] = useState<UnusualSetState | null>(null);
  const recentForced = useRef<Set<string>>(new Set());
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exerciseDialogSheet, setExerciseDialogSheet] = useState<
    null | "equipment" | "muscle"
  >(null);
  const [pendingSheet, setPendingSheet] = useState<
    null | "equipment" | "muscle"
  >(null);
  const [isEquipmentPickerOpen, setIsEquipmentPickerOpen] = useState(false);
  const [isMusclePickerOpen, setIsMusclePickerOpen] = useState(false);
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  const [isCreateEquipmentPickerOpen, setIsCreateEquipmentPickerOpen] =
    useState(false);
  const [isCreateMusclePickerOpen, setIsCreateMusclePickerOpen] =
    useState(false);
  const [exerciseToReplace, setExerciseToReplace] = useState<string | null>(
    null,
  );
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [replaceFilter, setReplaceFilter] = useState<string | null>(null);
  const [exerciseInfoOpen, setExerciseInfoOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>();
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
  const [filterMuscle, setFilterMuscle] = useState<"all" | string>("all");
  const [filterEquipment, setFilterEquipment] = useState<"all" | string>("all");

  // Disable background scroll while Create Exercise modal is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (isCreateExerciseOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev;
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isCreateExerciseOpen]);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [editDurationHours, setEditDurationHours] = useState<number>(0);
  const [editDurationMinutes, setEditDurationMinutes] = useState<number>(0);

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
      map.set(e.name.toLowerCase(), normalize(e)),
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
    const s = new Set<string>();
    allExercises.forEach((e) => s.add(e.muscleGroup));
    return Array.from(s);
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
            (e) =>
              !(e as any).equipment ||
              normalize((e as any).equipment.toString()) !== sel,
          )
          .slice(0, 6)
          .map((e) => ({ name: e.name, equipment: (e as any).equipment }));
        // eslint-disable-next-line no-console
        console.log(
          "[DEBUG] EditWorkout filterEquipment=",
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
        const eqRaw = (exercise as any).equipment?.toString();
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

  const availableEquipments = useMemo(() => {
    const s = new Set<string>();
    allExercises.forEach((e) => {
      if ((e as any).equipment) s.add((e as any).equipment);
    });
    return Array.from(s);
  }, [allExercises]);

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
          : ex,
      ),
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
          (w) => String(w.id) === String(workoutId),
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
            `workout:exerciseNotes:${workoutId}`,
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
            (ue) => String(ue.id) === String(exerciseId),
          );
          const exerciseName = (exerciseRecord || { name: exerciseId }).name;
          let exerciseMuscle = (exerciseRecord || { muscleGroup: "calves" })
            .muscleGroup;

          // Normalize HIIT/bodyweight exercises to cardio for display so
          // they show the cardio tag instead of calves/quads/etc.
          try {
            const n = String(exerciseName || "").toLowerCase();
            const isHiitName =
              n.includes("burpee") ||
              n.includes("mountain") ||
              n.includes("climb") ||
              n.includes("jump squat") ||
              n.includes("plank jack") ||
              n.includes("skater");
            if (isHiitName) {
              exerciseMuscle = "cardio";
            }
          } catch (e) {}

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
                    : (s.duration_seconds ?? 0);
                const distanceMeters =
                  typeof s.distance === "number"
                    ? s.distance
                    : (s.distance_meters ?? undefined);
                const floors =
                  typeof s.floors === "number"
                    ? s.floors
                    : (s.floors ?? undefined);
                const level =
                  typeof s.level === "number"
                    ? s.level
                    : (s.level ?? undefined);
                const splitSeconds =
                  typeof s.splitSeconds === "number"
                    ? s.splitSeconds
                    : (s.split_seconds ?? undefined);

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
                      : (level ?? 0);
                else if (mode === "stairs")
                  uiStat = typeof level === "number" ? level : 0;
                else uiStat = typeof level === "number" ? level : 0;

                // For HIIT/bodyweight cardio exercises, recover reps from
                // where we store them in CardioSet. For non-stairs HIIT we
                // stash reps in the `floors` field to avoid DecimalField
                // limits on level; fall back to the level-based stat for
                // older data that didn't use floors.
                const nameLower = exerciseName.toLowerCase();
                const isHiitName =
                  nameLower.includes("burpee") ||
                  nameLower.includes("mountain") ||
                  nameLower.includes("climb") ||
                  nameLower.includes("jump squat") ||
                  nameLower.includes("plank jack") ||
                  nameLower.includes("skater");

                let mappedReps = 0;
                if (isHiitName) {
                  if (
                    mode !== "stairs" &&
                    typeof floors === "number" &&
                    !isNaN(floors) &&
                    floors > 0
                  ) {
                    mappedReps = floors;
                  } else if (
                    typeof uiStat === "number" &&
                    !isNaN(uiStat) &&
                    uiStat > 0
                  ) {
                    mappedReps = uiStat;
                  }
                }

                return {
                  id: String(s.id),
                  reps: mappedReps,
                  weight: 0,
                  unit: getUnit(),
                  isPR: !!s.isPR,
                  completed: true,
                  type: "S",
                  rpe: undefined,
                  cardioMode: mode,
                  cardioDurationSeconds: durationSeconds,
                  cardioDistanceUnit:
                    mode === "stairs"
                      ? typeof floors === "number"
                        ? "flr"
                        : typeof distanceMeters === "number"
                          ? "m"
                          : "km"
                      : "km",
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

  const getCardioModeForExercise = (exercise: Exercise): CardioMode => {
    const name = exercise.name.toLowerCase();
    if (name.includes("treadmill")) return "treadmill";
    if (name.includes("bike") || name.includes("cycle")) return "bike";
    if (name.includes("elliptical")) return "elliptical";
    if (name.includes("stair") || name.includes("step")) return "stairs";
    if (name.includes("row")) return "row";
    return "treadmill";
  };

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
    const isCardio = exercise.muscleGroup === "cardio";
    const newSet = isCardio
      ? {
          id: crypto.randomUUID(),
          // cardio-specific defaults
          reps: 0,
          halfReps: 0,
          weight: 0,
          unit: getUnit(),
          isPR: false,
          completed: false,
          type: "S" as const,
          // cardio fields
          cardioMode: "treadmill",
          cardioDurationSeconds: 0,
          cardioDistanceUnit: "km",
          cardioDistance: 0,
          cardioStat: 0,
          cardioDistancePR: false,
          cardioPacePR: false,
          cardioAscentPR: false,
          cardioIntensityPR: false,
          cardioSplitPR: false,
        }
      : {
          id: crypto.randomUUID(),
          reps: 0,
          halfReps: 0,
          weight: 0,
          unit: getUnit(),
          isPR: false,
          completed: false,
          type: "S" as const,
          rpe: undefined,
        };

    const newExercise: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise,
      notes: "",
      sets: [newSet as any],
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
          const lastSet = ex.sets[ex.sets.length - 1] as any;
          const isCardio = ex.exercise.muscleGroup === "cardio";
          if (isCardio) {
            const newCardio = {
              id: crypto.randomUUID(),
              reps: 0,
              halfReps: (lastSet && lastSet.halfReps) || 0,
              weight: 0,
              unit: (lastSet && lastSet.unit) || getUnit(),
              isPR: false,
              completed: false,
              type: (lastSet && lastSet.type) || "S",
              cardioMode: (lastSet && lastSet.cardioMode) || "treadmill",
              cardioDurationSeconds:
                (lastSet && lastSet.cardioDurationSeconds) || 0,
              cardioDistanceUnit:
                (lastSet && lastSet.cardioDistanceUnit) || "km",
              cardioDistance: (lastSet && lastSet.cardioDistance) || 0,
              cardioStat: (lastSet && lastSet.cardioStat) || 0,
              cardioDistancePR: !!(lastSet && lastSet.cardioDistancePR),
              cardioPacePR: !!(lastSet && lastSet.cardioPacePR),
              cardioAscentPR: !!(lastSet && lastSet.cardioAscentPR),
              cardioIntensityPR: !!(lastSet && lastSet.cardioIntensityPR),
              cardioSplitPR: !!(lastSet && lastSet.cardioSplitPR),
            };
            return { ...ex, sets: [...ex.sets, newCardio] };
          }

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
      }),
    );
  };

  const updateSetLocal = (
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>,
  ) => {
    setExercises(
      exercises.map((ex) => {
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
          (ue) => normalize(ue.name) === normalize((ex.exercise as any).name),
        );
        if (match) exId = match.id;
        else {
          const createdEx = await createExercise(
            (ex.exercise as any).name,
            (ex.exercise as any).muscleGroup || "calves",
            "",
          );
          exId = createdEx.id;
          setExercises((prev) =>
            prev.map((ee) =>
              ee.id === exerciseLocalId
                ? { ...ee, exercise: { ...(ee.exercise as any), id: exId } }
                : ee,
            ),
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

      // Treat a set as cardio-backed only when it originated from a cardio
      // record (i.e. has a cardioMode). This prevents HIIT/bodyweight sets
      // that are stored as strength records from incorrectly using the
      // cardio endpoints when they gain duration/reps fields in the UI.
      const isCardioSet = !!(s as any).cardioMode;

      // Determine whether this workout should be allowed to introduce new PRs.
      // For past-dated workouts we keep existing PR flags but do not create
      // new ones when editing, so retro changes don't show new trophies.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const workoutDay = new Date(startTime);
      workoutDay.setHours(0, 0, 0, 0);
      const allowPrForWorkout = workoutDay.getTime() >= today.getTime();

      if (/^[0-9]+$/.test(String(s.id))) {
        let saved: any;
        if (isCardioSet) {
          const mode = (s as any).cardioMode as any;
          const rawDistance =
            typeof (s as any).cardioDistance === "number"
              ? (s as any).cardioDistance
              : undefined;
          let distanceMeters: number | undefined = undefined;
          if (typeof rawDistance === "number") {
            const unit =
              (s as any).cardioDistanceUnit === "mile"
                ? "mile"
                : (s as any).cardioDistanceUnit === "m"
                  ? "m"
                  : (s as any).cardioDistanceUnit === "flr"
                    ? "flr"
                    : "km";
            if (unit === "mile")
              distanceMeters = Math.round(rawDistance * 1609.34);
            else if (unit === "km")
              distanceMeters = Math.round(rawDistance * 1000);
            else if (unit === "m") distanceMeters = Math.round(rawDistance);
            else distanceMeters = Math.round(rawDistance * 1000);
          }

          const durationSeconds =
            typeof (s as any).cardioDurationSeconds === "number"
              ? (s as any).cardioDurationSeconds
              : undefined;
          let level: number | undefined = undefined;
          let splitSeconds: number | undefined = undefined;
          if (mode === "row")
            splitSeconds =
              typeof (s as any).cardioStat === "number"
                ? (s as any).cardioStat
                : undefined;
          else
            level =
              typeof (s as any).cardioStat === "number"
                ? (s as any).cardioStat
                : undefined;

          {
            let distanceParam = distanceMeters;
            let floorsParam: number | undefined = undefined;
            if (mode === "stairs") {
              const distUnit =
                (s as any).cardioDistanceUnit === "m" ? "m" : "flr";
              if (distUnit === "m") {
                distanceParam = rawDistance || undefined; // meters
              } else {
                distanceParam = undefined;
                floorsParam =
                  typeof rawDistance === "number"
                    ? Math.round(rawDistance)
                    : undefined;
              }
            }

            saved = await updateCardioSet(String(s.id), {
              mode,
              durationSeconds,
              distance: distanceParam,
              floors: floorsParam,
              level,
              splitSeconds,
            });
          }
        } else {
          const savedLocal = await updateSet(String(s.id), payload);
          saved = savedLocal;
        }
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
                        },
                  ),
                },
          ),
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
          if (isCardioSet) {
            const mode = (s as any).cardioMode as any;
            const rawDistance =
              typeof (s as any).cardioDistance === "number"
                ? (s as any).cardioDistance
                : undefined;
            let distanceMeters: number | undefined = undefined;
            if (typeof rawDistance === "number") {
              const unit =
                (s as any).cardioDistanceUnit === "mile"
                  ? "mile"
                  : (s as any).cardioDistanceUnit === "m"
                    ? "m"
                    : (s as any).cardioDistanceUnit === "flr"
                      ? "flr"
                      : "km";
              if (unit === "mile")
                distanceMeters = Math.round(rawDistance * 1609.34);
              else if (unit === "km")
                distanceMeters = Math.round(rawDistance * 1000);
              else if (unit === "m") distanceMeters = Math.round(rawDistance);
              else distanceMeters = Math.round(rawDistance * 1000);
            }
            const durationSeconds =
              typeof (s as any).cardioDurationSeconds === "number"
                ? (s as any).cardioDurationSeconds
                : undefined;
            let level: number | undefined = undefined;
            let splitSeconds: number | undefined = undefined;
            if (mode === "row")
              splitSeconds =
                typeof (s as any).cardioStat === "number"
                  ? (s as any).cardioStat
                  : undefined;
            else
              level =
                typeof (s as any).cardioStat === "number"
                  ? (s as any).cardioStat
                  : undefined;

            {
              let distanceParam = distanceMeters;
              let floorsParam: number | undefined = undefined;
              if (mode === "stairs") {
                const distUnit =
                  (s as any).cardioDistanceUnit === "m" ? "m" : "flr";
                if (distUnit === "m") {
                  distanceParam = rawDistance || undefined; // meters
                } else {
                  distanceParam = undefined;
                  floorsParam =
                    typeof rawDistance === "number"
                      ? Math.round(rawDistance)
                      : undefined;
                }
              }

              // compute next set number for this workout+exercise to avoid duplicates
              let setNumberToUse: number | undefined = undefined;
              try {
                const existing = await getCardioSetsForWorkout(
                  String(workoutId),
                );
                const sameEx = (existing || []).filter(
                  (c: any) => String(c.exercise) === String(exId),
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
                workoutId: workoutId,
                exerciseId: exId,
                mode,
                durationSeconds,
                distance: distanceParam,
                floors: floorsParam,
                level,
                splitSeconds,
              };
              if (typeof setNumberToUse === "number")
                payload.setNumber = setNumberToUse;
              created = await createCardioSet(payload);
            }
          } else {
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
          }
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
                  "",
                );
                exId = createdEx.id;
                setExercises((prev) =>
                  prev.map((ee) =>
                    ee.id === ex.id
                      ? {
                          ...ee,
                          exercise: { ...(ee.exercise as any), id: exId },
                        }
                      : ee,
                  ),
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
            if (isCardioSet) {
              const mode = (s as any).cardioMode as any;
              const rawDistance =
                typeof (s as any).cardioDistance === "number"
                  ? (s as any).cardioDistance
                  : undefined;
              const distanceMeters =
                typeof rawDistance === "number"
                  ? (s as any).cardioDistanceUnit === "mile"
                    ? Math.round(rawDistance * 1609.34)
                    : Math.round(rawDistance * 1000)
                  : undefined;
              const durationSeconds =
                typeof (s as any).cardioDurationSeconds === "number"
                  ? (s as any).cardioDurationSeconds
                  : undefined;
              let level: number | undefined = undefined;
              let splitSeconds: number | undefined = undefined;
              if (mode === "row")
                splitSeconds =
                  typeof (s as any).cardioStat === "number"
                    ? (s as any).cardioStat
                    : undefined;
              else
                level =
                  typeof (s as any).cardioStat === "number"
                    ? (s as any).cardioStat
                    : undefined;

              // compute a safe set number for retry
              let setNumberToUseRetry2: number | undefined = undefined;
              try {
                const existing = await getCardioSetsForWorkout(
                  String(workoutId),
                );
                const sameEx = (existing || []).filter(
                  (c: any) => String(c.exercise) === String(exId),
                );
                const max = sameEx.reduce(
                  (m: number, it: any) =>
                    Math.max(
                      m,
                      typeof it.setNumber === "number" ? it.setNumber : 0,
                    ),
                  0,
                );
                setNumberToUseRetry2 = max + 1;
              } catch (e) {
                setNumberToUseRetry2 = undefined;
              }

              const payloadRetry2: any = {
                workoutId: workoutId,
                exerciseId: exId,
                mode,
                durationSeconds,
                distance: distanceMeters,
                floors:
                  mode === "stairs"
                    ? typeof (s as any).cardioDistance === "number"
                      ? Math.round((s as any).cardioDistance)
                      : undefined
                    : undefined,
                level,
                splitSeconds,
              };
              if (typeof setNumberToUseRetry2 === "number")
                payloadRetry2.setNumber = setNumberToUseRetry2;
              created = await createCardioSet(payloadRetry2);
            } else {
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
                  typeof (s as any).rpe === "number"
                    ? (s as any).rpe
                    : undefined,
              });
            }
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
                        },
                  ),
                },
          ),
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
        startTime.getMonth() + 1,
      )}-${pad(startTime.getDate())}`;

      await updateWorkout(workoutId, {
        name: workoutName,
        notes,
        date: workoutDate,
      });

      // delete existing strength and cardio sets then recreate
      const original = await getSets(workoutId);
      for (const s of original) {
        try {
          await deleteSet(String(s.id));
        } catch (e) {}
      }
      try {
        const cardioExisting = await getCardioSetsForWorkout(String(workoutId));
        for (const cs of cardioExisting) {
          try {
            await deleteCardioSet(String(cs.id));
          } catch (e) {}
        }
      } catch (e) {
        // ignore errors deleting cardio sets - continue
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
            (ue) => normalize(ue.name) === normalize(ex.exercise.name),
          );
          if (match) {
            exId = match.id;
          } else {
            const created = await createExercise(
              ex.exercise.name,
              (ex.exercise as any).muscleGroup || "calves",
              "",
            );
            exId = created.id;
          }
        }

        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          try {
            // Skip empty sets that the user hasn't completed (avoid server validation errors)
            const isCardioExercise = ex.exercise.muscleGroup === "cardio";
            const isEmptyStrength =
              !isCardioExercise &&
              !s.completed &&
              (typeof s.reps !== "number" || s.reps <= 0) &&
              (typeof s.weight !== "number" || s.weight <= 0);
            const isEmptyCardio =
              isCardioExercise &&
              !s.completed &&
              (typeof (s as any).cardioDurationSeconds !== "number" ||
                (s as any).cardioDurationSeconds <= 0) &&
              (typeof (s as any).cardioDistance !== "number" ||
                (s as any).cardioDistance <= 0) &&
              (typeof (s as any).cardioStat !== "number" ||
                (s as any).cardioStat <= 0);

            if (isEmptyStrength || isEmptyCardio) {
              // Do not persist empty placeholder sets to the backend.
              continue;
            }

            // If this exercise is a cardio exercise, call the cardio endpoint
            let created: any;
            if (ex.exercise.muscleGroup === "cardio") {
              const mode = s.cardioMode || "treadmill";
              const durationSeconds = s.cardioDurationSeconds ?? 0;
              const rawDistance = s.cardioDistance ?? 0;
              const rawStatBase = s.cardioStat ?? 0;

              // For HIIT/bodyweight cardio, treat the generic stat as reps so
              // we can persist rep counts via the cardio schema without
              // hitting DecimalField limits on `level`.
              const nameLower = ex.exercise.name.toLowerCase();
              const isHiitName =
                nameLower.includes("burpee") ||
                nameLower.includes("mountain") ||
                nameLower.includes("climb") ||
                nameLower.includes("jump squat") ||
                nameLower.includes("plank jack") ||
                nameLower.includes("skater");
              const rawStat = isHiitName ? s.reps || 0 : rawStatBase;
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
                  // For HIIT/bodyweight cardio, stash reps in the `floors`
                  // field so we avoid DecimalField limits on `level` while
                  // still persisting large rep counts. Cardio PR logic for
                  // treadmill/bike/elliptical ignores `floors`, so this is
                  // safe.
                  if (isHiitName) {
                    floors = s.reps || 0 || undefined;
                    level = undefined;
                  } else {
                    level = rawStat || undefined;
                  }
                }
              }

              // compute next set number to avoid uniqueness errors
              let setNumberToUseMain: number | undefined = undefined;
              try {
                const existing = await getCardioSetsForWorkout(
                  String(curWorkoutId),
                );
                const sameEx = (existing || []).filter(
                  (c: any) => String(c.exercise) === String(exId),
                );
                const max = sameEx.reduce(
                  (m: number, it: any) =>
                    Math.max(
                      m,
                      typeof it.setNumber === "number" ? it.setNumber : 0,
                    ),
                  0,
                );
                setNumberToUseMain = max + 1;
              } catch (e) {
                setNumberToUseMain = undefined;
              }

              const payloadMain: any = {
                workoutId: curWorkoutId as string,
                exerciseId: exId,
                mode: mode as any,
                durationSeconds,
                distance,
                floors,
                level,
                splitSeconds,
              };
              if (typeof setNumberToUseMain === "number")
                payloadMain.setNumber = setNumberToUseMain;

              created = await createCardioSet(payloadMain);
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
                  "",
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
                const rawStatBase = s.cardioStat ?? 0;

                const nameLower = ex.exercise.name.toLowerCase();
                const isHiitName =
                  nameLower.includes("burpee") ||
                  nameLower.includes("mountain") ||
                  nameLower.includes("climb") ||
                  nameLower.includes("jump squat") ||
                  nameLower.includes("plank jack") ||
                  nameLower.includes("skater");
                const rawStat = isHiitName ? s.reps || 0 : rawStatBase;
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
                    if (isHiitName) {
                      floors = s.reps || 0 || undefined;
                      level = undefined;
                    } else {
                      level = rawStat || undefined;
                    }
                  }
                }

                // compute next set number for retry
                let setNumberToUseRetry: number | undefined = undefined;
                try {
                  const existing = await getCardioSetsForWorkout(
                    String(curWorkoutId),
                  );
                  const sameEx = (existing || []).filter(
                    (c: any) => String(c.exercise) === String(exId),
                  );
                  const max = sameEx.reduce(
                    (m: number, it: any) =>
                      Math.max(
                        m,
                        typeof it.setNumber === "number" ? it.setNumber : 0,
                      ),
                    0,
                  );
                  setNumberToUseRetry = max + 1;
                } catch (e) {
                  setNumberToUseRetry = undefined;
                }

                const payloadRetry: any = {
                  workoutId: curWorkoutId as string,
                  exerciseId: exId,
                  mode,
                  durationSeconds,
                  distance,
                  floors,
                  level,
                  splitSeconds,
                };
                if (typeof setNumberToUseRetry === "number")
                  payloadRetry.setNumber = setNumberToUseRetry;

                createdRetry = await createCardioSet(payloadRetry);
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
                    "0",
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
          : ex,
      ),
    );

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
      </div>
      {/* Fixed top action bar for Cancel / Save (replaces global header) */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-zinc-900 border-b border-white/10 shadow-sm shadow-black/30">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/workouts")}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={saveEditedWorkout}>
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-6 pt-[56px]">
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
                    : getDuration(),
                )}
              </button>
              <span>{exercises.length} exercises</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {exercises.map((workoutExercise) => (
            <Card
              key={workoutExercise.id}
              className="rounded-2xl overflow-hidden"
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
                                    setReplaceTarget(workoutExercise.id);
                                    setReplaceFilter(null);
                                    setExerciseSearch("");
                                    setFilterMuscle("all");
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
                        <span className="flex items-center justify-center">
                          SET
                        </span>
                        <span className="flex items-center justify-center">
                          DURATION
                        </span>

                        {isHiit ? (
                          <span className="flex items-center justify-center">
                            REPS
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            {getCardioModeForExercise(
                              workoutExercise.exercise,
                            ) === "stairs"
                              ? "CLIMB"
                              : "DISTANCE"}
                          </span>
                        )}

                        {isHiit ? (
                          <span className="flex items-center justify-center">
                            RPE
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            LEVEL
                          </span>
                        )}

                        <span className="flex items-center justify-center">
                          <Trophy className="h-3.5 w-3.5" />
                        </span>
                        <div />
                      </div>
                    );
                  })()
                ) : (
                  <div
                    className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
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
                      useDialogForSetType
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
            setReplaceTarget(null);
            setExerciseSearch("");
            setFilterMuscle("all");
            setIsExerciseDialogOpen(true);
          }}
        >
          {" "}
          <Plus className="h-4 w-4" /> Add Exercise
        </Button>

        <ExerciseInfo
          exerciseId={selectedExerciseId}
          exerciseName={selectedExerciseName}
          muscleGroup={selectedMuscleGroup}
          open={exerciseInfoOpen}
          onOpenChange={(o: boolean) => setExerciseInfoOpen(o)}
        />

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
                    setReplaceTarget(null);
                  }}
                  className="text-sm text-muted-foreground"
                >
                  Cancel
                </button>

                <DialogTitle className="font-heading text-base font-semibold mx-auto">
                  {replaceTarget ? "Replace Exercise" : "Add Exercise"}
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
                    </>

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
                            <div className="w-14 h-1.5 bg-zinc-800/40 rounded-full mx-auto mb-3" />
                            <div className="relative">
                              <button
                                onClick={() => setIsMusclePickerOpen(false)}
                                className="absolute right-3 top-0 text-zinc-400 hover:text-zinc-200"
                                aria-label="Close"
                              >
                                ×
                              </button>
                              <h3 className="text-center text-lg font-medium text-zinc-100">
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

                    {/* Reset button removed to match NewWorkout UI */}
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
                        onClick={() =>
                          replaceTarget
                            ? replaceExercise(replaceTarget, exercise)
                            : addExercise(exercise)
                        }
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
          onSubmit={handleCreateExercise}
          isSubmitting={createExerciseMutation.isLoading}
          isValidationOpen={isCreateValidationOpen}
          onValidationOpenChange={setIsCreateValidationOpen}
          validationMessage={createValidationMessage}
        />

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
                      : getDuration(),
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
                          String(clamped),
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
