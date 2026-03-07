import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { muscleGroupColors } from "@/data/mockData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createExercise, getExercises, deleteExercise } from "@/lib/api";
import type { UiExercise } from "@/lib/api";
import type { MuscleGroup } from "@/types/workout";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { libraryExercises } from "@/data/libraryExercises";
import { CreateExerciseDialog } from "@/components/workout/CreateExerciseDialog";

// muscle group order used for display; available groups are computed at runtime
// (removed static list so we only show groups actually present in data)

export default function Exercises() {
  const location = useLocation() as any;
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "all">(
    "all",
  );
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  // default to user's exercises view when opening the page,
  // but allow explicit tab restore via navigation state.
  const [showLibrary, setShowLibrary] = useState(
    Boolean(location?.state?.showLibrary),
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<MuscleGroup | "">(
    "",
  );
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<
    "all" | string
  >("all");
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [isCreateEquipmentPickerOpen, setIsCreateEquipmentPickerOpen] =
    useState(false);
  const [isCreateMusclePickerOpen, setIsCreateMusclePickerOpen] =
    useState(false);
  const [isCreateValidationOpen, setIsCreateValidationOpen] = useState(false);
  const [createValidationMessage, setCreateValidationMessage] =
    useState<string>("");

  const queryClient = useQueryClient();
  const { data: exercises = [], isLoading } = useQuery<UiExercise[]>({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  // Treat a "user exercise" as one that is marked custom by the
  // backend AND does not match any of the built-in library exercise
  // names. This prevents regular library movements that the user has
  // simply logged in a workout from appearing in the "your library"
  // section.
  const libraryNameSet = useMemo(
    () => new Set(libraryExercises.map((e) => e.name.toLowerCase())),
    [],
  );

  const isUserCustomExercise = (exercise: UiExercise): boolean => {
    if (!exercise.custom) return false;
    return !libraryNameSet.has(exercise.name.toLowerCase());
  };
  const createExerciseMutation = useMutation({
    mutationFn: async () =>
      createExercise(
        newExerciseName,
        (newExerciseMuscle as MuscleGroup) || "other",
        newExerciseDescription,
        {
          custom: true,
          equipment:
            newExerciseEquipment !== "all" ? newExerciseEquipment : undefined,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast({
        title: "Exercise created!",
        description: `${newExerciseName} has been added.`,
      });
      setNewExerciseName("");
      setNewExerciseMuscle("");
      setNewExerciseEquipment("all");
      setNewExerciseDescription("");
      setIsCreateExerciseOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to create exercise",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this exercise? This cannot be undone.");
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Deleted", description: "Exercise deleted." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const filteredExercises = exercises.filter((exercise) => {
    // Only show exercises that are truly user-created custom entries.
    if (!isUserCustomExercise(exercise)) return false;
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesMuscle =
      selectedMuscle === "all" || exercise.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const filteredLibrary = libraryExercises.filter((exercise) => {
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const normalizedGroup =
      exercise.muscleGroup === "other" &&
      exercise.name.toLowerCase().includes("calf")
        ? "calves"
        : exercise.muscleGroup;
    const matchesMuscle =
      selectedMuscle === "all" || normalizedGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  // compute available muscle groups from user's exercises + library, preserve friendly order
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
  const createMuscleOptions = allMusclesOrder;
  const [availableMuscles, setAvailableMuscles] = useState<MuscleGroup[]>([]);

  useEffect(() => {
    const present = new Set<string>();
    // Only consider user-created exercises when computing available muscle
    // groups for the user's library view.
    exercises
      .filter((e) => isUserCustomExercise(e))
      .forEach((e) =>
        present.add(e.muscleGroup === "other" ? "calves" : e.muscleGroup),
      );
    // only include public library groups when in library view
    if (showLibrary) {
      libraryExercises.forEach((e) =>
        present.add(e.muscleGroup === "other" ? "calves" : e.muscleGroup),
      );
    }
    const filtered = allMusclesOrder.filter((m) => present.has(m));
    setAvailableMuscles(filtered);
    if (
      selectedMuscle !== "all" &&
      !filtered.includes(selectedMuscle as MuscleGroup)
    ) {
      setSelectedMuscle("all");
    }
  }, [exercises, selectedMuscle, showLibrary]);
  const availableEquipments = useMemo(() => {
    const set = new Set<string>();
    (exercises as any[]).forEach((e) => {
      const eq = (e as any).equipment;
      if (eq) set.add(String(eq));
    });
    (libraryExercises as any[]).forEach((e) => {
      const eq = (e as any).equipment;
      if (eq) set.add(String(eq));
    });
    return Array.from(set);
  }, [exercises]);

  useEffect(() => {
    if (typeof location?.state?.showLibrary === "boolean") {
      setShowLibrary(Boolean(location.state.showLibrary));
    }
  }, [location?.state?.showLibrary]);

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

  // Precompute grid content to avoid deeply nested JSX ternaries
  const gridContent = showLibrary ? (
    filteredLibrary.length > 0 ? (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLibrary.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onClick={() => {
              try {
                navigate(`/exercises/${exercise.id}/info`, {
                  state: {
                    fromExercises: true,
                    returnShowLibrary: showLibrary,
                    exerciseName: exercise.name,
                    muscleGroup: exercise.muscleGroup,
                  },
                });
              } catch (e) {}
            }}
          />
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-white font-semibold">No library exercises found</p>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
      </div>
    )
  ) : filteredExercises.length > 0 ? (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredExercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          onDelete={handleDelete}
          onClick={() => {
            try {
              navigate(`/exercises/${exercise.id}/info`, {
                state: {
                  fromExercises: true,
                  returnShowLibrary: showLibrary,
                  exerciseName: exercise.name,
                  muscleGroup: exercise.muscleGroup,
                },
              });
            } catch (e) {}
          }}
        />
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
      <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-white font-semibold">No exercises found</p>
      <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              Exercise Library
            </h1>
            <p className="text-muted-foreground">
              {isLoading
                ? "Loading..."
                : showLibrary
                  ? `${libraryExercises.length} exercises in the public library`
                  : `${
                      exercises.filter((e) => isUserCustomExercise(e)).length
                    } exercises in your library`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-zinc-900 border border-white/10 p-1">
              <button
                type="button"
                onClick={() => setShowLibrary(false)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  !showLibrary
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Your Library
              </button>
              <button
                type="button"
                onClick={() => setShowLibrary(true)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  showLibrary
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Browse Library
              </button>
            </div>
            <Button onClick={() => setIsCreateExerciseOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
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
              availableMuscles={createMuscleOptions}
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
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter select removed - use pills below */}
        </div>

        {/* Muscle Group Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...availableMuscles] as const).map((muscle) => {
            const colorMap: Record<string, string> = {
              all: "bg-orange-500 border-orange-500 text-white",
              chest: "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30",
              back: "bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30",
              shoulders: "bg-purple-500/20 border-purple-500/40 text-purple-400 hover:bg-purple-500/30",
              biceps: "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30",
              triceps: "bg-indigo-500/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30",
              forearms: "bg-teal-500/20 border-teal-500/40 text-teal-400 hover:bg-teal-500/30",
              quads: "bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30",
              hamstrings: "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30",
              calves: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30",
              core: "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30",
              cardio: "bg-pink-500/20 border-pink-500/40 text-pink-400 hover:bg-pink-500/30",
              other: "bg-zinc-500/20 border-zinc-500/40 text-zinc-400 hover:bg-zinc-500/30",
            };

            const isSelected = selectedMuscle === muscle;
            const activeColorMap: Record<string, string> = {
              chest: "bg-red-500 border-red-500 text-white",
              back: "bg-blue-500 border-blue-500 text-white",
              shoulders: "bg-purple-500 border-purple-500 text-white",
              biceps: "bg-cyan-500 border-cyan-500 text-white",
              triceps: "bg-indigo-500 border-indigo-500 text-white",
              forearms: "bg-teal-500 border-teal-500 text-white",
              quads: "bg-orange-500 border-orange-500 text-white",
              hamstrings: "bg-amber-500 border-amber-500 text-white",
              calves: "bg-yellow-500 border-yellow-500 text-white",
              core: "bg-green-500 border-green-500 text-white",
              cardio: "bg-pink-500 border-pink-500 text-white",
              other: "bg-zinc-500 border-zinc-500 text-white",
            };

            const baseClass = isSelected
              ? muscle === "all"
                ? "bg-orange-500 border-orange-500 text-white"
                : activeColorMap[muscle] || "bg-zinc-500 border-zinc-500 text-white"
              : muscle === "all"
                ? "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/25"
                : colorMap[muscle] || "bg-zinc-900 border-white/10 text-zinc-400";

            return (
              <button
                key={muscle}
                type="button"
                onClick={() => setSelectedMuscle(muscle as MuscleGroup | "all")}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize ${baseClass}`}
              >
                {muscle === "all" ? "All" : muscle.charAt(0).toUpperCase() + muscle.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Exercise Grid */}
        {gridContent}
      </div>
    </AppLayout>
  );
}
