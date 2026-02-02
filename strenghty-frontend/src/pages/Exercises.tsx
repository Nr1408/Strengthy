import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "all">(
    "all",
  );
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  // default to user's exercises view when opening the page
  const [showLibrary, setShowLibrary] = useState(false);
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
    // Only show user-created custom exercises in the "your library" view.
    if (!exercise.custom) return false;
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
  const [availableMuscles, setAvailableMuscles] = useState<MuscleGroup[]>([]);

  useEffect(() => {
    const present = new Set<string>();
    // Only consider user-created exercises when computing available muscle
    // groups for the user's library view.
    exercises
      .filter((e) => e.custom)
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
                navigate(`/exercises/${exercise.id}/history`, {
                  state: {
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <p className="text-muted-foreground">No library exercises found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
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
              navigate(`/exercises/${exercise.id}/history`, {
                state: {
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
      <p className="text-muted-foreground">No exercises found</p>
      <p className="text-sm text-muted-foreground">
        Try adjusting your search or filters
      </p>
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
                      exercises.filter((e) => e.custom).length
                    } exercises in your library`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showLibrary ? "default" : "outline"}
              onClick={() => setShowLibrary((s) => !s)}
            >
              Browse Library
            </Button>

            <Button onClick={() => setIsCreateExerciseOpen(true)}>
              <Plus className="h-4 w-4" />
              New Exercise
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedMuscle === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMuscle("all")}
          >
            All
          </Button>
          {availableMuscles.map((muscle) => (
            <Button
              key={muscle}
              variant={selectedMuscle === muscle ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMuscle(muscle)}
              className={`${muscleGroupColors[muscle]} ${
                selectedMuscle === muscle ? "ring-2 ring-primary" : ""
              }`}
            >
              {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
            </Button>
          ))}
        </div>

        {/* Exercise Grid */}
        {gridContent}
      </div>
    </AppLayout>
  );
}
