import { useEffect, useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoutineCard } from "@/components/workout/RoutineCard";
import type { Routine } from "@/types/workout";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Routines() {
  const [myRoutines, setMyRoutines] = useState<Routine[]>(() => {
    try {
      const raw = localStorage.getItem("user:routines");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Routine[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [newRoutine, setNewRoutine] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem("user:routines", JSON.stringify(myRoutines));
    } catch {}
  }, [myRoutines]);

  const handleCreateRoutine = () => {
    if (!newRoutine.name) {
      toast({
        title: "Missing fields",
        description: "Please enter a routine name.",
        variant: "destructive",
      });
      return;
    }

    const routine: Routine = {
      id: `my-${crypto.randomUUID()}`,
      name: newRoutine.name.trim(),
      description: newRoutine.description.trim() || undefined,
      createdAt: new Date(),
      exercises: [],
    };

    // Close dialog and start a new workout based on this draft routine.
    setNewRoutine({ name: "", description: "" });
    setIsDialogOpen(false);

    toast({
      title: "Routine builder started",
      description: "Finish this workout to save it as a routine.",
    });

    try {
      const inProg = localStorage.getItem("workout:inProgress");
      if (inProg) {
        toast({
          title: "Workout in progress",
          description:
            "You already have a workout in progress. Resume or discard it before starting a new routine.",
          variant: "destructive",
        });
        navigate("/workouts/new");
        return;
      }
    } catch {}

    navigate("/workouts/new", { state: { routine, fromNewRoutine: true } });
  };

  const handleStartRoutine = (routine: Routine) => {
    try {
      const inProg = localStorage.getItem("workout:inProgress");
      if (inProg) {
        toast({
          title: "Workout in progress",
          description:
            "You already have a workout in progress. Resume or discard it before starting another.",
          variant: "destructive",
        });
        navigate("/workouts/new");
        return;
      }
    } catch {}

    toast({
      title: "Starting workout...",
      description: `${routine.name} loaded into a new workout`,
    });
    navigate("/workouts/new", { state: { routine } });
  };

  const handleDeleteRoutine = (id: string) => {
    setMyRoutines((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Routine deleted" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              Routines
            </h1>
            <p className="text-muted-foreground">
              {myRoutines.length} routine{myRoutines.length !== 1 ? "s" : ""}{" "}
              saved
            </p>
          </div>
          <Button
            variant="outline"
            className="text-white"
            onClick={() => navigate("/routines/explore")}
          >
            Explore
          </Button>
        </div>

        {/* My Routines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-white">
              My Routines
            </h2>
            <Button
              size="sm"
              className="flex items-center gap-2 text-white"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Routine
            </Button>
          </div>
          {myRoutines.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myRoutines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onStart={() => handleStartRoutine(routine)}
                  onClick={() =>
                    navigate(`/routines/${routine.id}/view`, {
                      state: { routine },
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-heading font-semibold text-white">
                No routines yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Create your first routine to save time
              </p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Routine
              </Button>
            </div>
          )}
        </div>

        {/* Explore Routines moved to /routines/explore */}

        {/* Create Routine Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Routine</DialogTitle>
              <DialogDescription>
                Create a reusable workout template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Routine Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Push Day, Upper Body"
                  value={newRoutine.name}
                  onChange={(e) =>
                    setNewRoutine({ ...newRoutine, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What does this routine focus on?"
                  value={newRoutine.description}
                  onChange={(e) =>
                    setNewRoutine({
                      ...newRoutine,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateRoutine} className="flex-1">
                Create Routine
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
