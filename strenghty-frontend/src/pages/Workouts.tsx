import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Calendar,
  Trophy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { useQuery } from "@tanstack/react-query";
import {
  getWorkouts,
  getExercises,
  createSet,
  createExercise,
  deleteSet,
} from "@/lib/api";
import { getUnit, setUnit } from "@/lib/utils";
import { libraryExercises as staticLibraryExercises } from "@/data/libraryExercises";
import { SetRow } from "@/components/workout/SetRow";
import { muscleGroupColors } from "@/data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { triggerHaptic } from "@/lib/haptics";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWorkout, updateWorkout, getSets, updateSet } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery as useRQ } from "@tanstack/react-query";

export default function Workouts() {
  const {
    data: workouts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  // Only treat workouts with an end time as "logged"
  const completedWorkouts = useMemo(
    () => workouts.filter((w) => w.endedAt),
    [workouts],
  );

  // Group workouts by date
  const groupedWorkouts = useMemo(() => {
    return completedWorkouts.reduce(
      (groups, workout) => {
        const dateKey = format(workout.date, "yyyy-MM-dd");
        if (!groups[dateKey]) {
          groups[dateKey] = [] as typeof workouts;
        }
        groups[dateKey].push(workout);
        return groups;
      },
      {} as Record<string, typeof workouts>,
    );
  }, [completedWorkouts]);

  const sortedDates = useMemo(
    () =>
      Object.keys(groupedWorkouts).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      ),
    [groupedWorkouts],
  );

  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // fetch sets for selected workout
  const setsQuery = useRQ({
    queryKey: ["sets", selectedWorkout?.id],
    queryFn: () =>
      selectedWorkout ? getSets(selectedWorkout.id) : Promise.resolve([]),
    enabled: !!selectedWorkout,
  });

  // fetch exercises so we can display exercise names instead of raw ids
  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  const exerciseMap = useMemo(() => {
    return exercises.reduce(
      (m: Record<string, string>, e) => {
        m[e.id] = e.name;
        return m;
      },
      {} as Record<string, string>,
    );
  }, [exercises]);

  // Edit mode state for workout detail dialog
  const [editMode, setEditMode] = useState(false);
  const [editableExercises, setEditableExercises] = useState<any[]>([]);

  // PR banner state (same behavior as NewWorkout)
  type PrBanner = {
    exerciseName: string;
    label: string;
    value: string;
  };
  const [prBanner, setPrBanner] = useState<PrBanner | null>(null);
  const [prQueue, setPrQueue] = useState<PrBanner[]>([]);
  const [prVisible, setPrVisible] = useState(false);

  // Build a combined exercise list (user + static library) for selection
  const { data: userExercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });
  const allExercises = useMemo(() => {
    const map = new Map<string, any>();
    staticLibraryExercises.forEach((e) => map.set(e.id, e));
    userExercises.forEach((e) => map.set(e.id, e));
    return Array.from(map.values());
  }, [userExercises]);

  // When there is no active/visible banner but queued records exist, show the next one
  useEffect(() => {
    if (!prVisible && !prBanner && prQueue.length > 0) {
      const [next, ...rest] = prQueue;
      setPrBanner(next);
      setPrQueue(rest);
      setPrVisible(true);
    }
  }, [prVisible, prBanner, prQueue]);

  // Auto-hide the current banner after a few seconds (start close animation)
  useEffect(() => {
    if (!prVisible) return;
    const timer = setTimeout(() => {
      setPrVisible(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [prVisible]);

  // After the close animation finishes, clear the current banner so the next can show
  useEffect(() => {
    if (prVisible || !prBanner) return;
    const timer = setTimeout(() => {
      setPrBanner(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [prVisible, prBanner]);

  const enterEditMode = () => {
    if (!selectedWorkout) return;

    if (setsQuery.isLoading) {
      toast({
        title: "Loading sets",
        description: "Please wait a moment and try again.",
      });
      return;
    }

    const data = setsQuery.data || [];
    if (data.length === 0) {
      toast({
        title: "No sets to edit",
        description: "This workout has no logged sets yet.",
      });
      return;
    }

    const grouped = Array.from(
      data.reduce((m: Map<string, any[]>, s: any) => {
        if (!m.has(s.exercise)) m.set(s.exercise, []);
        m.get(s.exercise).push(s);
        return m;
      }, new Map<string, any[]>()),
    ).map(([exerciseId, sets]) => ({
      tempId: crypto.randomUUID(),
      exerciseId,
      name: exerciseMap[exerciseId] || exerciseId,
      sets: sets
        .slice()
        .sort((a: any, b: any) => a.setNumber - b.setNumber)
        .map((s: any) => ({ ...s, _dirty: false })),
    }));
    setEditableExercises(grouped);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditableExercises([]);
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    setEditableExercises((prev) => {
      const next = prev.slice();
      const ni = idx + dir;
      if (ni < 0 || ni >= next.length) return prev;
      const tmp = next[ni];
      next[ni] = next[idx];
      next[idx] = tmp;
      return next;
    });
  };

  const updateEditableSet = (
    exerciseTempId: string,
    setId: string,
    updates: any,
    markDirty: boolean = true,
  ) => {
    setEditableExercises((prev) =>
      prev.map((ex) =>
        ex.tempId === exerciseTempId
          ? {
              ...ex,
              sets: ex.sets.map((s: any) =>
                s.id === setId
                  ? { ...s, ...updates, _dirty: markDirty ? true : s._dirty }
                  : s,
              ),
            }
          : ex,
      ),
    );
  };

  // Persist a single set change immediately when user toggles complete in edit mode.
  const handleEditableSetComplete = async (
    exerciseTempId: string,
    setId: string,
  ) => {
    const ex = editableExercises.find((e) => e.tempId === exerciseTempId);
    if (!ex || !selectedWorkout) return;
    const s = ex.sets.find((ss: any) => ss.id === setId);
    if (!s) return;

    // Optimistically toggle completed locally
    updateEditableSet(
      exerciseTempId,
      setId,
      { completed: !s.completed },
      false,
    );

    // Only run PR-related persistence when the set is being marked
    // complete (check button turns green). Toggling a set back to
    // incomplete should not trigger PR detection or banners.
    const nowCompleted = !s.completed;
    if (!nowCompleted) return;

    try {
      let exId = ex.exerciseId;
      const isNumeric = /^[0-9]+$/.test(String(exId));
      if (!isNumeric) {
        // create the exercise if it doesn't exist yet
        const normalize = (str: string) =>
          str
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
        const match = (userExercises as any[]).find(
          (ue) => normalize(ue.name) === normalize(ex.name),
        );
        if (match) {
          exId = match.id;
        } else {
          const created = await createExercise(
            ex.name,
            (ex.muscleGroup as any) || "calves",
            ex.description || "",
          );
          exId = created.id;
          // update local editableExercises to swap in numeric id
          setEditableExercises((prev) =>
            prev.map((ee) =>
              ee.tempId === exerciseTempId ? { ...ee, exerciseId: exId } : ee,
            ),
          );
        }
      }

      // Build payload from current set values
      const payload: any = {
        reps: s.reps || 0,
        weight: typeof s.weight === "undefined" ? null : s.weight,
        unit: s.unit || getUnit(),
        type: (s as any).type,
        rpe: typeof (s as any).rpe === "number" ? (s as any).rpe : undefined,
      };

      // For historical workouts (dated before today), avoid introducing new
      // PR flags from edits; we track overrides in localStorage so other
      // views (cards, dashboard) can suppress these retro PRs.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let allowPrForWorkout = true;
      try {
        if (selectedWorkout && selectedWorkout.date instanceof Date) {
          const d = new Date(selectedWorkout.date);
          d.setHours(0, 0, 0, 0);
          allowPrForWorkout = d.getTime() >= today.getTime();
        }
      } catch (e) {}

      if (/^[0-9]+$/.test(String(s.id))) {
        // persisted set: PATCH
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
        // update local set with server flags
        setEditableExercises((prev) =>
          prev.map((ee) =>
            ee.tempId !== exerciseTempId
              ? ee
              : {
                  ...ee,
                  sets: ee.sets.map((ss: any) =>
                    ss.id !== setId
                      ? ss
                      : {
                          ...ss,
                          // preserve PR indicators unless this set was marked dirty
                          isPR: ss._dirty ? saved.isPR : ss.isPR,
                          absWeightPR: ss._dirty
                            ? saved.absWeightPR
                            : ss.absWeightPR,
                          e1rmPR: ss._dirty ? saved.e1rmPR : ss.e1rmPR,
                          volumePR: ss._dirty ? saved.volumePR : ss.volumePR,
                          // repPR removed per UX request
                          unit: saved.unit || ss.unit,
                          _dirty: false,
                        },
                  ),
                },
          ),
        );

        // If the saved set is not a PR but previously showed as PR, ensure UI reflects removal
        if (!saved.isPR) {
          // nothing else to do; UI updated above
        }
        // If saved is PR, optionally queue banners (user didn't request here)
        try {
          // If this set newly became a PR (wasn't locally marked before), trigger a light haptic
          if (!s.isPR && saved.isPR) {
            triggerHaptic();
          }
        } catch (e) {}
      } else {
        // local set: create on server
        const created = await createSet({
          workoutId: selectedWorkout.id,
          exerciseId: exId,
          setNumber: s.setNumber || 1,
          reps: s.reps || 0,
          weight: s.weight,
          unit: s.unit || getUnit(),
          type: s.type,
          rpe: typeof (s as any).rpe === "number" ? (s as any).rpe : undefined,
        });

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

        setEditableExercises((prev) =>
          prev.map((ee) =>
            ee.tempId !== exerciseTempId
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
                          _dirty: false,
                        },
                  ),
                },
          ),
        );

        // If the created set is not a PR and previously indicated PR, the UI is already updated
        try {
          if (!s.isPR && created.isPR) {
            triggerHaptic();
          }
        } catch (e) {}
      }
    } catch (err: any) {
      toast({
        title: "Failed to update set",
        description: String(err),
        variant: "destructive",
      });
      // revert optimistic toggle on error
      updateEditableSet(
        exerciseTempId,
        setId,
        { completed: s.completed },
        false,
      );
    }
  };

  const addEditableSet = (exerciseTempId: string) => {
    setEditableExercises((prev) =>
      prev.map((ex) => {
        if (ex.tempId !== exerciseTempId) return ex;
        const last = ex.sets[ex.sets.length - 1];
        const newSet = {
          id: `local-${crypto.randomUUID()}`,
          setNumber: (last?.setNumber || ex.sets.length) + 1,
          reps: last?.reps || 0,
          weight: last?.weight || 0,
          unit: last?.unit,
          isPR: false,
          type: (last as any)?.type || "S",
          rpe:
            typeof (last as any)?.rpe === "number"
              ? (last as any).rpe
              : undefined,
          _dirty: true,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    );
  };

  const removeEditableSet = (exerciseTempId: string, setId: string) => {
    setEditableExercises((prev) =>
      prev.map((ex) =>
        ex.tempId === exerciseTempId
          ? { ...ex, sets: ex.sets.filter((s: any) => s.id !== setId) }
          : ex,
      ),
    );
  };

  const removeEditableExercise = (exerciseTempId: string) => {
    setEditableExercises((prev) =>
      prev.filter((ex) => ex.tempId !== exerciseTempId),
    );
  };

  const changeEditableExercise = (
    exerciseTempId: string,
    newExerciseId: string,
  ) => {
    const name =
      allExercises.find((a) => a.id === newExerciseId)?.name || newExerciseId;
    setEditableExercises((prev) =>
      prev.map((ex) =>
        ex.tempId === exerciseTempId
          ? { ...ex, exerciseId: newExerciseId, name }
          : ex,
      ),
    );
  };

  const saveEditedWorkout = async () => {
    if (!selectedWorkout) return;
    try {
      const newPrBanners: PrBanner[] = [];

      await updateMutation.mutateAsync({
        id: selectedWorkout.id,
        data: { name: editName, notes: editNotes },
      });

      // delete all original sets for the workout, then recreate from editableExercises
      const originalSetIds = setsQuery.data
        ? setsQuery.data.map((s: any) => s.id)
        : [];
      for (const id of originalSetIds) {
        try {
          await deleteSet(id);
        } catch (e) {
          // ignore individual delete errors
        }
      }

      // persist exercises/sets
      for (const ex of editableExercises) {
        let exId = ex.exerciseId;
        const isNumeric = /^[0-9]+$/.test(String(exId));
        if (!isNumeric) {
          // try to match existing user exercise by name
          const normalize = (s: string) =>
            s
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .trim();
          const match = userExercises.find(
            (ue: any) => normalize(ue.name) === normalize(ex.name),
          );
          if (match) {
            exId = match.id;
          } else {
            const created = await createExercise(
              ex.name,
              (ex.muscleGroup as any) || "calves",
              ex.description || "",
            );
            exId = created.id;
          }
        }

        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          const created = await createSet({
            workoutId: selectedWorkout.id,
            exerciseId: exId,
            setNumber: i + 1,
            reps: s.reps || 0,
            weight: s.weight,
            unit: s.unit || getUnit(),
            isPR: !!s.isPR,
            type: (s as any).type,
            rpe:
              typeof (s as any).rpe === "number" ? (s as any).rpe : undefined,
          });

          // If this set was edited/added and is a PR, queue banners
          if ((s as any)._dirty && created.isPR) {
            const unit =
              (created.unit as "lbs" | "kg" | undefined) || getUnit();
            const weight =
              typeof created.weight === "number" ? created.weight : 0;
            const reps = created.reps;

            const exerciseName = ex.name;
            const banners: PrBanner[] = [];

            if (created.absWeightPR && weight > 0) {
              banners.push({
                exerciseName,
                label: "Heaviest Weight",
                value: `${weight.toFixed(1)} ${unit}`,
              });
            }

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

            // "Most Reps at this Weight" banner removed per UX request

            if (banners.length > 0) {
              newPrBanners.push(...banners);
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["sets", selectedWorkout.id] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      setEditMode(false);
      // close dialog and refresh any cached dashboards/sets
      setSelectedWorkout(null);
      queryClient.invalidateQueries();
      if (newPrBanners.length > 0) {
        setPrQueue((prev) => [...prev, ...newPrBanners]);
      }
      toast({ title: "Workout updated" });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  // Small dropdown picker to replace native <select> and constrain dropdown height
  function ExercisePicker({
    value,
    options,
    onChange,
  }: {
    value: string;
    options: any[];
    onChange: (id: string) => void;
  }) {
    const [openLocal, setOpenLocal] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | string>("all");
    const selected = options.find((o) => o.id === value) || options[0];

    const muscleGroups = useMemo(() => {
      const set = new Set<string>();
      options.forEach((o) => set.add(o.muscleGroup || "calves"));
      return Array.from(set.values());
    }, [options]);

    const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      return options.filter((o) => {
        if (filter !== "all" && (o.muscleGroup || "calves") !== filter)
          return false;
        if (!q) return true;
        return (
          o.name.toLowerCase().includes(q) ||
          (o.muscleGroup || "").toLowerCase().includes(q)
        );
      });
    }, [options, search, filter]);

    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setOpenLocal((s) => !s)}
          className="flex items-center gap-2 rounded-md bg-muted/10 px-2 py-1 text-sm"
        >
          <span className="truncate max-w-xs">{selected?.name || value}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        {openLocal && (
          <div className="absolute left-0 z-50 mt-1 w-72 max-h-[50vh] overflow-hidden rounded border border-border bg-neutral-900 p-2">
            <div className="mb-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full"
              />
            </div>
            <div className="mb-2 flex gap-2 overflow-x-auto py-1">
              <button
                onClick={() => setFilter("all")}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
                  filter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/10 text-muted-foreground"
                }`}
              >
                All
              </button>
              {muscleGroups.map((m) => {
                const colorClass =
                  (muscleGroupColors as any)[m] ||
                  "bg-muted/10 text-muted-foreground";
                const active = filter === m;
                return (
                  <button
                    key={m}
                    onClick={() => setFilter(m)}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${colorClass} ${
                      active
                        ? "ring-2 ring-offset-1 ring-white/10 font-semibold"
                        : "opacity-95"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  onClick={() => {
                    onChange(o.id);
                    setOpenLocal(false);
                    setSearch("");
                    setFilter("all");
                  }}
                  className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <span>{o.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {o.muscleGroup === "other" ? "calves" : o.muscleGroup}
                    </span>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">
                  No results
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkout(id),
    onSuccess: () => {
      // Ensure all dashboard- and workout-related stats recompute after deletion
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["sets"] });
      queryClient.invalidateQueries({ queryKey: ["setsByWorkout"] });
      queryClient.invalidateQueries({ queryKey: ["setsByWorkoutThis"] });
      queryClient.invalidateQueries({ queryKey: ["setsByWorkoutPrev"] });
      setSelectedWorkout(null);
      toast({ title: "Workout deleted" });
    },
    onError: (err: any) =>
      toast({
        title: "Delete failed",
        description: String(err),
        variant: "destructive",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateWorkout(id, data),
    onSuccess: (w) => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      setSelectedWorkout(w);
      toast({ title: "Workout updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Update failed",
        description: String(err),
        variant: "destructive",
      }),
  });

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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              Workouts
            </h1>
            <p className="text-muted-foreground">
              {isLoading
                ? "Loading..."
                : isError
                  ? "Failed to load"
                  : `${completedWorkouts.length} workout${
                      completedWorkouts.length !== 1 ? "s" : ""
                    } logged`}
            </p>
          </div>
          <Button
            onClick={() => {
              try {
                const inProg = localStorage.getItem("workout:inProgress");
                if (inProg) {
                  // prefer toast but fall back to alert if toast unavailable
                  alert(
                    "You already have a workout in progress. Resume or discard it before starting another.",
                  );
                  navigate("/workouts/new");
                  return;
                }
              } catch {}
              navigate("/workouts/new");
            }}
          >
            <Plus className="h-4 w-4" />
            New Workout
          </Button>
        </div>

        {/* Workout List */}
        {isLoading ? (
          <div className="text-muted-foreground">Loading workouts...</div>
        ) : sortedDates.length > 0 ? (
          <div className="space-y-8">
            {sortedDates.map((dateKey) => {
              const date = new Date(dateKey);
              const isToday = format(new Date(), "yyyy-MM-dd") === dateKey;
              const isYesterday =
                format(new Date(Date.now() - 86400000), "yyyy-MM-dd") ===
                dateKey;

              let dateLabel = format(date, "EEEE, MMMM d");
              if (isToday) dateLabel = "Today";
              if (isYesterday) dateLabel = "Yesterday";

              return (
                <div key={dateKey}>
                  <div className="mb-4 flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">{dateLabel}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groupedWorkouts[dateKey].map((workout) => (
                      <WorkoutCard
                        key={workout.id}
                        workout={workout}
                        onClick={() => navigate(`/workouts/${workout.id}/view`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-heading font-semibold text-white">
              No workouts yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Start your first workout to see it here
            </p>
            <div className="mt-4">
              <Button
                onClick={() => {
                  try {
                    const inProg = localStorage.getItem("workout:inProgress");
                    if (inProg) {
                      alert(
                        "You already have a workout in progress. Resume or discard it before starting another.",
                      );
                      navigate("/workouts/new");
                      return;
                    }
                  } catch {}
                  navigate("/workouts/new");
                }}
              >
                <Plus className="h-4 w-4" />
                Start Workout
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Workout Detail Dialog */}
      <Dialog
        open={!!selectedWorkout}
        onOpenChange={(open) => {
          if (!open) setSelectedWorkout(null);
        }}
      >
        <DialogContent className="w-[97vw] max-w-md sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workout Details</DialogTitle>
            <DialogDescription>View or edit this workout.</DialogDescription>
          </DialogHeader>

          {selectedWorkout && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <h4 className="text-sm font-medium">Exercises</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    {!editMode ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/workouts/${selectedWorkout.id}/edit`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // add a blank exercise (selectable)
                            const pick = allExercises[0];
                            setEditableExercises((prev) => [
                              ...prev,
                              {
                                tempId: crypto.randomUUID(),
                                exerciseId: pick?.id || `lib-1`,
                                name: pick?.name || "New Exercise",
                                sets: [
                                  {
                                    id: `local-${crypto.randomUUID()}`,
                                    setNumber: 1,
                                    reps: 0,
                                    weight: 0,
                                    isPR: false,
                                  },
                                ],
                              },
                            ]);
                          }}
                        >
                          Add Exercise
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={saveEditedWorkout}
                        >
                          Save Changes
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>

                  {setsQuery.isLoading ? (
                    <p className="text-muted-foreground">Loading sets...</p>
                  ) : !editMode ? (
                    setsQuery.data && setsQuery.data.length > 0 ? (
                      // Group sets by exercise id for display
                      Array.from(
                        setsQuery.data.reduce((m, s) => {
                          if (!m.has(s.exercise))
                            m.set(s.exercise, [] as any[]);
                          m.get(s.exercise).push(s);
                          return m;
                        }, new Map<string, any[]>()),
                      ).map(([exerciseId, sets]) => (
                        <div
                          key={exerciseId}
                          className="rounded-md border border-border p-2"
                        >
                          <div className="text-sm font-medium">
                            {exerciseMap[exerciseId]
                              ? `Exercise: ${exerciseMap[exerciseId]}`
                              : `Exercise ID: ${exerciseId}`}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {sets.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between"
                              >
                                <span>Set {s.setNumber}</span>
                                <span className="flex items-center gap-2">
                                  <span>
                                    {s.reps} reps{" "}
                                    {s.weight
                                      ? `• ${s.weight} ${s.unit || "kg"}`
                                      : ""}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No sets recorded for this workout.
                      </p>
                    )
                  ) : // EDIT MODE: show editable exercise cards
                  editableExercises.length > 0 ? (
                    editableExercises.map((ex, idx) => (
                      <div
                        key={ex.tempId}
                        className="rounded-md border border-border p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground">
                              Exercise
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <ExercisePicker
                                value={ex.exerciseId}
                                options={allExercises}
                                onChange={(id) =>
                                  changeEditableExercise(ex.tempId, id)
                                }
                              />
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  removeEditableExercise(ex.tempId)
                                }
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {ex.sets.map((s: any, si: number) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 w-full overflow-hidden"
                            >
                              <div className="flex-1">
                                <SetRow
                                  set={s}
                                  exerciseName={ex.name}
                                  unit={s.unit || getUnit()}
                                  setNumber={si + 1}
                                  onUpdate={(updates) =>
                                    updateEditableSet(ex.tempId, s.id, updates)
                                  }
                                  onUnitChange={(u) =>
                                    updateEditableSet(ex.tempId, s.id, {
                                      unit: u,
                                    })
                                  }
                                  onComplete={() =>
                                    handleEditableSetComplete(ex.tempId, s.id)
                                  }
                                />
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  removeEditableSet(ex.tempId, s.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addEditableSet(ex.tempId)}
                            >
                              Add Set
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No exercises to edit.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (selectedWorkout) {
                      deleteMutation.mutate(selectedWorkout.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
                {!editMode ? (
                  <Button
                    onClick={() => {
                      if (selectedWorkout) {
                        updateMutation.mutate({
                          id: selectedWorkout.id,
                          data: { name: editName, notes: editNotes },
                        });
                      }
                    }}
                  >
                    Save
                  </Button>
                ) : (
                  <Button onClick={saveEditedWorkout}>Save</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
