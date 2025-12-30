import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Save,
  Trash2,
  Clock,
  ChevronRight,
  Trophy,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { SetRow } from "@/components/workout/SetRow";
import { mockExercises } from "@/data/mockData";
import { WorkoutExercise, WorkoutSet, Exercise } from "@/types/workout";
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

export default function NewWorkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workoutName, setWorkoutName] = useState("New Workout");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [startTime] = useState(new Date());

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch.trim()) return mockExercises;
    const query = exerciseSearch.toLowerCase();
    return mockExercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(query) ||
        exercise.muscleGroup.toLowerCase().includes(query)
    );
  }, [exerciseSearch]);

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
          isPR: false,
          completed: false,
        },
      ],
    };
    setExercises([...exercises, newExercise]);
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
                isPR: false,
                completed: false,
              },
            ],
          };
        }
        return ex;
      })
    );
  };

  const updateSet = (
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

  const toggleSetComplete = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map((ex) => {
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
  };

  const toggleSetPR = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.id === setId ? { ...set, isPR: !set.isPR } : set
            ),
          };
        }
        return ex;
      })
    );
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

  const saveWorkout = () => {
    if (exercises.length === 0) {
      toast({
        title: "No exercises added",
        description: "Add at least one exercise to save your workout.",
        variant: "destructive",
      });
      return;
    }

    const totalPRs = exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.isPR).length,
      0
    );

    toast({
      title: "Workout saved!",
      description: `${exercises.length} exercises, ${
        totalPRs > 0
          ? `${totalPRs} PR${totalPRs > 1 ? "s" : ""}!`
          : "Great session!"
      }`,
    });
    navigate("/workouts");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
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
            <Button onClick={saveWorkout}>
              <Save className="h-4 w-4" />
              Save Workout
            </Button>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-6">
          {exercises.map((workoutExercise) => (
            <Card key={workoutExercise.id}>
              <CardContent className="p-4">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-semibold">
                      {workoutExercise.exercise.name}
                    </h3>
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
                <div className="mb-2 flex items-center gap-3 px-3 text-xs font-medium text-muted-foreground">
                  <span className="w-8 text-center">SET</span>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="flex-1 text-center">WEIGHT</span>
                    <span className="w-4" />
                    <span className="flex-1 text-center">REPS</span>
                  </div>
                  <span className="w-9 text-center">
                    <Trophy className="mx-auto h-3.5 w-3.5" />
                  </span>
                  <span className="w-9" />
                </div>

                {/* Sets */}
                <div className="space-y-2">
                  {workoutExercise.sets.map((set, index) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      setNumber={index + 1}
                      onUpdate={(updates) =>
                        updateSet(workoutExercise.id, set.id, updates)
                      }
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
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4" />
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

        {/* Add Exercise Button */}
        <Button
          variant="outline"
          className="w-full border-dashed text-white"
          onClick={() => setIsExerciseDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>

        {/* Exercise Selection Dialog */}
        <Dialog
          open={isExerciseDialogOpen}
          onOpenChange={(open) => {
            setIsExerciseDialogOpen(open);
            if (!open) setExerciseSearch("");
          }}
        >
          <DialogContent className="max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
              <DialogDescription>
                Select an exercise from your library.
              </DialogDescription>
            </DialogHeader>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              {filteredExercises.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No exercises found matching "{exerciseSearch}"
                </p>
              ) : (
                filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => addExercise(exercise)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{exercise.name}</p>
                      <Badge
                        variant="secondary"
                        className={muscleGroupColors[exercise.muscleGroup]}
                      >
                        {exercise.muscleGroup}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
