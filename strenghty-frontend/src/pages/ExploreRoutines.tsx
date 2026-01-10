import { AppLayout } from "@/components/layout/AppLayout";
import { RoutineCard } from "@/components/workout/RoutineCard";
import { mockRoutines } from "@/data/mockData";
import type { Routine } from "@/types/workout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ExploreRoutines() {
  const navigate = useNavigate();
  const exploreRoutines: Routine[] = mockRoutines;

  const handleStartRoutine = (routine: Routine) => {
    try {
      const inProg = localStorage.getItem("workout:inProgress");
      if (inProg) {
        // If there's already an in-progress workout, direct the user to resume it
        // and warn them instead of starting another.
        // Using a simple alert here because this file doesn't import the toast hook.
        // The caller will land on /workouts/new where they can resume or discard.
        alert(
          "You already have a workout in progress. Resume or discard it before starting another."
        );
        navigate("/workouts/new");
        return;
      }
    } catch {}

    navigate("/workouts/new", { state: { routine } });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              Explore Routines
            </h1>
            <p className="text-muted-foreground">
              Starter templates like Push, Pull, Legs, Upper and Lower body.
            </p>
          </div>
          <Button
            variant="outline"
            className="text-white"
            onClick={() => navigate("/routines")}
          >
            Back to My Routines
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exploreRoutines.map((routine) => (
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
      </div>
    </AppLayout>
  );
}
