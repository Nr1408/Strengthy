const GRID_TEMPLATE =
  "minmax(30px, 0.7fr) minmax(40px, 1.2fr) minmax(40px, 1fr) 10px minmax(40px, 1.2fr) minmax(42px, 1fr) 35px 32px";

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
import {
  WorkoutExercise,
  WorkoutSet,
  Exercise,
  Routine,
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
  finishWorkout,
  getExercises,
  createExercise,
  getToken,
} from "@/lib/api";
import { libraryExercises as staticLibraryExercises } from "@/data/libraryExercises";

export default function NewWorkout() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { routine?: Routine; fromNewRoutine?: boolean; forceNew?: boolean };
  };
  const fromRoutine = location.state?.routine;
  const isNewRoutineTemplate = !!location.state?.fromNewRoutine;
  const isRoutineBuilder = !!fromRoutine && isNewRoutineTemplate;
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
        sets: Array.from({ length: re.targetSets }).map(() => ({
          id: crypto.randomUUID(),
          reps: 0,
          weight: 0,
          unit: getUnit(),
          isPR: false,
          completed: false,
          type: "S" as const,
          rpe: undefined,
        })),
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
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exerciseToReplace, setExerciseToReplace] = useState<string | null>(
    null
  );
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [startTime] = useState(new Date());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paused, setPaused] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("workout:paused");
    } catch (e) {
      return false;
    }
  });
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
    staticLibraryExercises.forEach((e) => map.set(e.name.toLowerCase(), e));
    userExercises.forEach((e) => map.set(e.name.toLowerCase(), e));
    return Array.from(map.values());
  }, [userExercises]);

  const createWorkoutMutation = useMutation({
    mutationFn: (name: string) => createWorkout(name),
    onSuccess: (w) => {
      setWorkoutId(w.id);
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to start workout",
        description: String(err),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!hasToken && !isRoutineBuilder) {
      navigate("/auth");
    }
  }, [hasToken, isRoutineBuilder, navigate]);

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
          }
          try {
            localStorage.removeItem("workout:paused");
            setPaused(false);
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
        JSON.stringify({ exercises, elapsedSec, workoutName, notes })
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
        localStorage.removeItem("workout:paused");
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

  const getDuration = () => {
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const addExercise = (exercise: Exercise) => {
    const newExercise: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise,
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
        },
      ],
    };
    setExercises([...exercises, newExercise]);
    setIsExerciseDialogOpen(false);
  };

  const replaceExerciseForCard = (
    workoutExerciseId: string,
    newExercise: Exercise
  ) => {
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

  const toggleSetComplete = async (exerciseId: string, setId: string) => {
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

      const saved = isPersisted
        ? await updateSet(String(set.id), payload)
        : await createSet({
            workoutId: String(wId),
            exerciseId: backendExerciseId,
            ...payload,
          });

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
                        isPR: saved.isPR,
                        absWeightPR: saved.absWeightPR,
                        e1rmPR: saved.e1rmPR,
                        volumePR: saved.volumePR,
                        unit: saved.unit || s.unit,
                      }
                    : s
                ),
              }
        )
      );

      if (saved.isPR) {
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

  const removeExercise = (exerciseId: string) => {
    setExercises(exercises.filter((ex) => ex.id !== exerciseId));
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map((ex) => {
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

    // Pure routine builder mode: don't create a workout or log sets.
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

      // Exclude exercises that have no sets with reps or weight entered
      const nonEmptyExercises = exercises.filter((ex) =>
        ex.sets.some(
          (s) =>
            (s.reps || 0) > 0 || (typeof s.weight === "number" && s.weight > 0)
        )
      );

      const exercisesToPersist = await Promise.all(
        nonEmptyExercises.map(async (ex) => {
          const exIdStr = String(ex.exercise.id);
          const isNumericId = /^[0-9]+$/.test(exIdStr);
          if (isNumericId) return ex;

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
      for (const ex of exercisesToPersist) {
        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          const isPersisted = /^[0-9]+$/.test(String(s.id));
          if (isPersisted) continue;

          const created = await createSet({
            workoutId: workoutId!,
            exerciseId: ex.exercise.id,
            setNumber: i + 1,
            reps: s.reps,
            weight: s.weight,
            unit: s.unit || getUnit(),
            type: s.type,
            rpe: s.rpe,
          });
          if (created.isPR) createdPrCount += 1;
        }
      }
      await finishWorkout(workoutId!);
      setExercises(exercisesToPersist);
      queryClient.invalidateQueries({ queryKey: ["workouts"] });

      // If this workout was started from a newly created routine draft,
      // save its structure as a reusable routine template.
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
          // Ignore routine save errors; workout is still saved.
        }
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
      } catch (e) {}
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
      <div className="pointer-events-none fixed left-1/2 top-16 z-40 -translate-x-1/2 flex justify-center w-full px-4">
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
              {!isRoutineBuilder && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {getDuration()}
                </span>
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
              <CardContent className="px-1.5 py-4 sm:p-4">
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
                      {workoutExercise.exercise.muscleGroup}
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

                {/* Sets Header */}
                <div
                  className="mb-2 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2" // Ensure px-2 and gap-2
                  style={{ gridTemplateColumns: GRID_TEMPLATE }}
                >
                  <span className="text-center">SET</span>
                  <span className="text-center">WEIGHT</span>
                  <span className="text-center">UNIT</span>
                  <div /> {/* Column 4: matches the '×' */}
                  <span className="text-center">REPS</span>
                  <span className="text-center">RPE</span>
                  <span className="text-center">
                    <Trophy className="mx-auto h-3.5 w-3.5" />
                  </span>
                  <div /> {/* Column 8: matches the Checkmark */}
                </div>
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
                        toggleSetComplete(workoutExercise.id, set.id)
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
          <DialogContent className="max-h-[85vh] flex flex-col bg-[#0f0f0f] border-border text-white">
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
                className="pl-10 bg-muted/20 border-border focus:ring-primary"
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
                      <Badge
                        variant="secondary"
                        className={muscleGroupColors[exercise.muscleGroup]}
                      >
                        {exercise.muscleGroup}
                      </Badge>
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
