import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Routine } from "@/types/workout";

function estimateDuration(routine: Routine) {
  // Simple deterministic estimate: 8 minutes per exercise
  const minutes = (routine?.exercises?.length || 6) * 8;
  return `${minutes} min`;
}

function deriveFocus(routine: Routine) {
  const name = (routine?.name || "").toLowerCase();
  const desc = (routine?.description || "").toLowerCase();
  if (name.includes("upper") || desc.includes("upper")) return "Upper Body";
  if (name.includes("push") || desc.includes("push"))
    return "Push / Chest & Shoulders";
  if (name.includes("pull") || desc.includes("pull"))
    return "Pull / Back & Biceps";
  if (name.includes("leg") || desc.includes("lower")) return "Lower Body";
  if (desc.includes("hypertrophy")) return "Hypertrophy Focus";
  return routine?.name || "Full Body";
}

export default function WorkoutPreview() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { routine?: Routine; label?: string; firstTime?: boolean };
  };

  const routine = location.state?.routine;
  const label = location.state?.label || routine?.name || "Your Workout";

  if (!routine) {
    // If called without a routine, go back to dashboard
    navigate("/dashboard");
    return null;
  }

  const focus = deriveFocus(routine);
  const duration = estimateDuration(routine);

  const onStart = () => {
    // When user opts to start, create the workout from the routine and navigate to view.
    // Reuse existing NewWorkout flow: navigate to `/workouts/new` and request autostart.
    try {
      navigate("/workouts/new", {
        state: { routine, forceNew: true, autostartAndView: true },
      });
    } catch (e) {
      navigate("/dashboard");
    }
  };

  const onViewRoutine = () => {
    navigate(`/routines/${routine.id}/view`, { state: { routine } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-xl p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white mb-2">
            {label}
          </h1>
          <p className="text-sm text-white">
            Based on your goal, experience, and equipment.
          </p>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white">Target</div>
              <div className="font-medium text-white">{focus}</div>
            </div>
            <div>
              <div className="text-xs text-white">Est. Duration</div>
              <div className="font-medium text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-white" /> {duration}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={onStart}>
            Start Workout
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={onViewRoutine}
          >
            View Routine
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
