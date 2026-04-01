import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Helper to read routines from localStorage
const readRoutinesFromStorage = (): Routine[] => {
  try {
    const raw = localStorage.getItem("user:routines");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Routine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function Routines() {
  const [myRoutines, setMyRoutines] = useState<Routine[]>(() =>
    readRoutinesFromStorage(),
  );

  // Re-read routines whenever the page gains focus (same-tab navigation back
  // from NewWorkout) or when another tab writes to localStorage.
  useEffect(() => {
    const refresh = () => setMyRoutines(readRoutinesFromStorage());

    // Fires when this tab regains focus (e.g. user navigates back from /workouts/new)
    window.addEventListener("focus", refresh);

    // Fires for same-tab writes via a custom event dispatched by NewWorkout/Routines
    window.addEventListener("routines:updated", refresh);

    // Fires for cross-tab localStorage writes (StorageEvent only crosses tab boundaries)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "user:routines" || e.key === "user:routines:updated") {
        refresh();
      }
    };
    window.addEventListener("storage", handleStorage);

    // Also refresh immediately on mount in case we navigated back
    refresh();

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("routines:updated", refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [newRoutine, setNewRoutine] = useState({
    name: "",
    description: "",
  });

  // NOTE: No reactive useEffect writes myRoutines back to localStorage.
  // Each mutation (create, delete) writes directly instead.
  // A reactive write here races with NewWorkout's exercise saves and
  // would overwrite the routine with 0 exercises before the state flushes.

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

    // Immediately save to localStorage and update state so the card appears
    // right away when the user returns from the workout builder.
    try {
      const stored = readRoutinesFromStorage();
      const updated = [...stored, routine];
      localStorage.setItem("user:routines", JSON.stringify(updated));
      localStorage.setItem("user:routines:updated", Date.now().toString());
      // Notify same-tab listeners (focus event won't fire if tab never lost focus)
      window.dispatchEvent(new Event("routines:updated"));
      setMyRoutines(updated);
    } catch {}

    setNewRoutine({ name: "", description: "" });
    setIsDialogOpen(false);

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
    navigate("/workouts/new", {
      state: {
        routine,
        originPath: "/routines",
      },
    });
  };

  const handleDeleteRoutine = (id: string) => {
    setMyRoutines((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem("user:routines", JSON.stringify(updated));
        window.dispatchEvent(new Event("routines:updated"));
      } catch {}
      return updated;
    });
    toast({ title: "Routine deleted" });
    try {
      // If the deleted routine was cached in the workout builder or currentRoutine
      // storage, remove those entries to avoid stale restores.
      const currentRaw = localStorage.getItem("workout:currentRoutine");
      if (currentRaw) {
        try {
          const parsed = JSON.parse(currentRaw);
          if (parsed && parsed.id === id) {
            try {
              localStorage.removeItem("workout:currentRoutine");
            } catch {}
            try {
              localStorage.removeItem("workout:isRoutineBuilder");
            } catch {}
          }
        } catch {}
      }

      const builderRaw = localStorage.getItem("workout:routineBuilder");
      if (builderRaw) {
        try {
          const parsed = JSON.parse(builderRaw);
          if (parsed && parsed.routineId === id) {
            try {
              localStorage.removeItem("workout:routineBuilder");
            } catch {}
            try {
              localStorage.removeItem("workout:inProgress");
            } catch {}
          }
        } catch {}
      }
    } catch (e) {}
  };

  return (
    <AppLayout noPaddingTop>
      <div className="space-y-6 pt-2">
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
          <button
            type="button"
            onClick={() => navigate("/routines/explore")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/15 text-orange-400 text-sm font-semibold border border-orange-500/25 hover:bg-orange-500/25 transition-colors"
          >
            Explore Templates →
          </button>
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
                  onDelete={() => handleDeleteRoutine(routine.id)}
                  onClick={() =>
                    navigate(`/routines/${routine.id}/view`, {
                      state: { routine },
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-white font-semibold">No routines yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first routine to save time
              </p>
              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/15 text-orange-400 text-sm font-semibold border border-orange-500/25 hover:bg-orange-500/25 transition-colors"
              >
                <Plus className="h-4 w-4" /> Create Routine
              </button>
            </div>
          )}
        </div>

        {/* Create Routine Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="floating-card fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[calc(100%-48px)] max-w-[420px] rounded-[20px] bg-[#121212] backdrop-blur-0 border border-[#262626] px-8 pt-3 pb-10 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {/* Grab handle */}
              <div className="w-10 h-1 bg-zinc-800/50 rounded-full mx-auto mt-3 mb-6" />

              <div className="text-center">
                <DialogTitle className="text-xl font-bold">
                  Create Routine
                </DialogTitle>
                <p className="mt-1 text-xs text-zinc-500">
                  Create a reusable sequence of exercises
                </p>
              </div>

              <div className="mt-4 max-h-[50vh] overflow-y-auto pr-2">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-[#A0A0A0] text-sm font-medium"
                    >
                      Routine Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., Push Day, Upper Body"
                      value={newRoutine.name}
                      onChange={(e) =>
                        setNewRoutine({ ...newRoutine, name: e.target.value })
                      }
                      className="bg-[#1E1E1E] border border-[#2A2A2A] placeholder:text-[#555555] focus-visible:border-[#FF7000] focus-visible:ring-0 px-4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-[#A0A0A0] text-sm font-medium"
                    >
                      Description (optional)
                    </Label>
                    <Input
                      id="description"
                      placeholder="What does this routine focus on?"
                      value={newRoutine.description}
                      onChange={(e) =>
                        setNewRoutine({
                          ...newRoutine,
                          description: e.target.value,
                        })
                      }
                      className="bg-[#1E1E1E] border border-[#2A2A2A] placeholder:text-[#555555] focus-visible:border-[#FF7000] focus-visible:ring-0 px-4"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <div className="flex flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 text-sm text-[#A0A0A0] font-medium rounded-xl bg-transparent px-3 py-2 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleCreateRoutine}
                    className="flex-1 bg-[#FF7000] text-white font-bold rounded-xl"
                  >
                    Create
                  </Button>
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
