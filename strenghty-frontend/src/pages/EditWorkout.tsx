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
import { getUnit } from "@/lib/utils";
import { WorkoutExercise, WorkoutSet, Exercise } from "@/types/workout";
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
  updateSet,
  updateWorkout,
  deleteSet,
} from "@/lib/api";
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
  const [startTime] = useState(new Date());

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
        }
        const sets = await getSets(String(workoutId));
        // group sets by exercise id
        const grouped = Array.from(
          sets.reduce((m: Map<string, any[]>, s) => {
            if (!m.has(s.exercise)) m.set(s.exercise, []);
            m.get(s.exercise).push(s);
            return m;
          }, new Map<string, any[]>())
        ).map(([exerciseId, sets]) => ({
          id: crypto.randomUUID(),
          exercise: {
            id: exerciseId,
            name: (
              userExercises.find(
                (ue) => String(ue.id) === String(exerciseId)
              ) || { name: exerciseId }
            ).name,
            muscleGroup: (
              userExercises.find(
                (ue) => String(ue.id) === String(exerciseId)
              ) || { muscleGroup: "full-body" }
            ).muscleGroup,
          } as Exercise,
          sets: sets
            .slice()
            .sort((a: any, b: any) => a.setNumber - b.setNumber)
            .map((s: any) => ({
              id: String(s.id),
              reps: s.reps,
              weight: s.weight || 0,
              unit: s.unit || getUnit(),
              isPR: s.isPR,
              completed: true,
              type: s.type || "S",
              rpe: s.rpe,
            })),
        }));
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
            (ex.exercise as any).muscleGroup || "full-body",
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
        weight: typeof s.weight === "undefined" ? null : s.weight,
        unit: s.unit || getUnit(),
        type: (s as any).type,
        rpe: typeof (s as any).rpe === "number" ? (s as any).rpe : undefined,
      };

      if (/^[0-9]+$/.test(String(s.id))) {
        const saved = await updateSet(String(s.id), payload);
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
                          isPR: saved.isPR,
                          absWeightPR: saved.absWeightPR,
                          e1rmPR: saved.e1rmPR,
                          volumePR: saved.volumePR,
                          // repPR removed per UX request
                          unit: saved.unit || ss.unit,
                        }
                  ),
                }
          )
        );

        if (saved.isPR) {
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
        const created = await createSet({
          workoutId: workoutId,
          exerciseId: exId,
          setNumber: s.setNumber || 1,
          reps: s.reps || 0,
          weight: s.weight,
          unit: s.unit || getUnit(),
          type: s.type,
          rpe: typeof (s as any).rpe === "number" ? (s as any).rpe : undefined,
        });

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
                          isPR: created.isPR,
                          absWeightPR: created.absWeightPR,
                          e1rmPR: created.e1rmPR,
                          volumePR: created.volumePR,
                          // repPR removed per UX request
                          unit: created.unit || ss.unit,
                        }
                  ),
                }
          )
        );

        if (created.isPR) {
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
    try {
      await updateWorkout(workoutId, { name: workoutName, notes });

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
              (ex.exercise as any).muscleGroup || "full-body",
              ""
            );
            exId = created.id;
          }
        }

        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          await createSet({
            workoutId: workoutId,
            exerciseId: exId,
            setNumber: i + 1,
            reps: s.reps || 0,
            weight: s.weight,
            unit: s.unit || getUnit(),
            type: s.type,
            rpe: s.rpe,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["sets", workoutId] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
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
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {getDuration()} min
              </span>
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
              <CardContent className="px-1.5 py-4 sm:p-4">
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
                      {workoutExercise.exercise.muscleGroup}
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

                <div
                  className="mb-2 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                  style={{
                    gridTemplateColumns:
                      "minmax(30px, 0.7fr) minmax(40px, 1.2fr) minmax(40px, 1fr) 10px minmax(40px, 1.2fr) minmax(42px, 1fr) 35px 32px",
                  }}
                >
                  <span className="text-center">SET</span>
                  <span className="text-center">WEIGHT</span>
                  <span className="text-center">UNIT</span>
                  <div /> {/* Spacer for the '×' column */}
                  <span className="text-center">REPS</span>
                  <span className="text-center">RPE</span>
                  <span className="text-center">
                    <Trophy className="mx-auto h-3.5 w-3.5" />
                  </span>
                  <div /> {/* Spacer for the Checkmark column */}
                </div>

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
          <DialogContent className="max-h-[85vh] flex flex-col bg-[#0f0f0f] border-border text-white">
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
