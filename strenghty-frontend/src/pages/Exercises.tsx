import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

// muscle group order used for display; available groups are computed at runtime
// (removed static list so we only show groups actually present in data)

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "all">(
    "all",
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // default to user's exercises view when opening the page
  const [showLibrary, setShowLibrary] = useState(false);
  const { toast } = useToast();

  const [newExercise, setNewExercise] = useState({
    name: "",
    muscleGroup: "" as MuscleGroup | "",
    description: "",
  });

  const queryClient = useQueryClient();
  const { data: exercises = [], isLoading } = useQuery<UiExercise[]>({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });
  const createMutation = useMutation({
    mutationFn: async () =>
      createExercise(
        newExercise.name,
        newExercise.muscleGroup as MuscleGroup,
        newExercise.description,
        { custom: true },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
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

  const handleCreateExercise = async () => {
    if (!newExercise.name || !newExercise.muscleGroup) {
      toast({
        title: "Missing fields",
        description: "Please fill in the exercise name and muscle group.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createMutation.mutateAsync();
      toast({
        title: "Exercise created!",
        description: `${newExercise.name} has been added.`,
      });
      setNewExercise({ name: "", muscleGroup: "", description: "" });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create exercise",
        variant: "destructive",
      });
    }
  };

  // Precompute grid content to avoid deeply nested JSX ternaries
  const gridContent = showLibrary ? (
    filteredLibrary.length > 0 ? (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLibrary.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  New Exercise
                </Button>
              </DialogTrigger>
              <DialogContent className="floating-card fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[calc(100%-48px)] max-w-[420px] rounded-[32px] bg-zinc-900/80 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-8 pt-3 pb-10">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="w-10 h-1 bg-zinc-800/50 rounded-full mx-auto mt-3 mb-6" />

                  <div className="text-center">
                    <DialogTitle className="text-xl font-bold">
                      Create Exercise
                    </DialogTitle>
                    <p className="mt-1 text-xs text-zinc-500">
                      Add a new exercise to your personal library.
                    </p>
                  </div>

                  <div className="mt-4 max-h-[50vh] overflow-y-auto pr-2 space-y-8">
                    <div className="space-y-2">
                      <Label htmlFor="name">Exercise Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Incline Dumbbell Press"
                        value={newExercise.name}
                        onChange={(e) =>
                          setNewExercise({
                            ...newExercise,
                            name: e.target.value,
                          })
                        }
                        className="bg-black/20 border border-transparent focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500/40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="muscle">Muscle Group</Label>
                      <Select
                        value={newExercise.muscleGroup}
                        onValueChange={(value) =>
                          setNewExercise({
                            ...newExercise,
                            muscleGroup: value as MuscleGroup,
                          })
                        }
                      >
                        <SelectTrigger className="bg-black/20 border border-transparent focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500/40">
                          <SelectValue placeholder="Select muscle group" />
                        </SelectTrigger>
                        <SelectContent className="p-0">
                          {allMusclesOrder.map((muscle) => (
                            <SelectItem
                              key={muscle}
                              value={muscle}
                              className="px-6 py-4"
                            >
                              {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Description (optional)
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Add notes about form, cues, or variations..."
                        value={newExercise.description}
                        onChange={(e) =>
                          setNewExercise({
                            ...newExercise,
                            description: e.target.value,
                          })
                        }
                        className="bg-black/20 border border-transparent focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500/40"
                      />
                    </div>
                  </div>

                  <div className="mt-10">
                    <div className="flex flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1 text-sm text-zinc-500 font-medium rounded-xl bg-transparent px-3 py-2 hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={handleCreateExercise}
                        className="flex-1 bg-orange-500 text-white font-semibold rounded-xl shadow-[0_0_25px_rgba(249,115,22,0.25)]"
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </DialogContent>
            </Dialog>
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
