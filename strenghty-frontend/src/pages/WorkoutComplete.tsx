import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Routine } from "@/types/workout";

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { suggestedRoutine?: Routine; label?: string };
  };

  const suggested = location.state?.suggestedRoutine;
  const label =
    location.state?.label ||
    (suggested ? `Next: ${suggested.name}` : "Suggested next workout");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Great job — your first workout is complete
          </h1>
          <p className="text-sm text-white mt-2">
            You’ve taken an important first step toward your goal.
          </p>
        </div>

        <Card className="p-4 mb-6">
          <div className="text-sm text-white mb-2">What this means</div>
          <div className="font-medium text-white mb-2">
            Keep building momentum toward your goal.
          </div>
          <div className="text-sm text-white">{label}</div>
        </Card>

        {suggested && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white">Suggested next workout</div>
                <div className="font-medium text-white">{suggested.name}</div>
              </div>
              <div className="text-sm text-white">
                {suggested.exercises?.length || 0} exercises
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>
          {suggested && (
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() =>
                navigate(`/routines/${suggested.id}/view`, {
                  state: { routine: suggested },
                })
              }
            >
              View Suggested Routine
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
