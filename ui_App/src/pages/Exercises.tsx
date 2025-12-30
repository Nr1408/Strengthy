import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { mockExercises, muscleGroupColors } from "@/data/mockData";
import { MuscleGroup } from "@/types/workout";
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
import { SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const muscleGroups: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "cardio",
  "full-body",
];

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "all">(
    "all"
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newExercise, setNewExercise] = useState({
    name: "",
    muscleGroup: "" as MuscleGroup | "",
    description: "",
  });

  const filteredExercises = mockExercises.filter((exercise) => {
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesMuscle =
      selectedMuscle === "all" || exercise.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const handleCreateExercise = () => {
    if (!newExercise.name || !newExercise.muscleGroup) {
      toast({
        title: "Missing fields",
        description: "Please fill in the exercise name and muscle group.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Exercise created!",
      description: `${newExercise.name} has been added to your library.`,
    });
    setNewExercise({ name: "", muscleGroup: "", description: "" });
    setIsDialogOpen(false);
  };

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
              {mockExercises.length} exercises in your library
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                New Exercise
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Exercise</DialogTitle>
                <DialogDescription>
                  Add a new exercise to your personal library.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exercise Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Incline Dumbbell Press"
                    value={newExercise.name}
                    onChange={(e) =>
                      setNewExercise({ ...newExercise, name: e.target.value })
                    }
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select muscle group" />
                    </SelectTrigger>
                    <SelectContent>
                      {muscleGroups.map((muscle) => (
                        <SelectItem key={muscle} value={muscle}>
                          {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
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
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateExercise}>Create Exercise</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          {muscleGroups.map((muscle) => (
            <Button
              key={muscle}
              variant={selectedMuscle === muscle ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMuscle(muscle)}
              className={
                selectedMuscle === muscle ? "" : muscleGroupColors[muscle]
              }
            >
              {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
            </Button>
          ))}
        </div>

        {/* Exercise Grid */}
        {filteredExercises.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredExercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <p className="text-muted-foreground">No exercises found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
