import { AppLayout } from "@/components/layout/AppLayout";
import { RoutineCard } from "@/components/workout/RoutineCard";
import { mockRoutines } from "@/data/mockData";
import type { Routine } from "@/types/workout";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import WorkoutInProgressDialog from "@/components/layout/WorkoutInProgressDialog";

export default function ExploreRoutines() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showInProgressDialog, setShowInProgressDialog] = useState(false);
  const exploreRoutines: Routine[] = mockRoutines;

  const filteredRoutines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exploreRoutines;
    return exploreRoutines.filter((routine) => {
      if (routine.name.toLowerCase().includes(q)) return true;
      if (routine.description?.toLowerCase().includes(q)) return true;
      return routine.exercises.some((re) =>
        re.exercise.name.toLowerCase().includes(q),
      );
    });
  }, [exploreRoutines, search]);

  const handleStartRoutine = (routine: Routine) => {
    try {
      const inProg = localStorage.getItem("workout:inProgress");
      if (inProg) {
        setShowInProgressDialog(true);
        return;
      }
    } catch {}

    navigate("/workouts/new", { state: { routine } });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              Explore Routines
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Starter templates like Push, Pull, Legs, Upper and Lower body.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/routines")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors shrink-0 mt-1"
          >
            ← My Routines
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search routines by name, focus, or exercise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoutines.map((routine) => (
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
        {filteredRoutines.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-white font-semibold">No routines found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      <WorkoutInProgressDialog
        open={showInProgressDialog}
        onOpenChange={setShowInProgressDialog}
        onResume={() => navigate("/workouts/new")}
      />
    </AppLayout>
  );
}
