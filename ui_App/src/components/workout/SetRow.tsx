import { Check, Trophy } from "lucide-react";
import { WorkoutSet } from "@/types/workout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SetRowProps {
  set: WorkoutSet;
  setNumber: number;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onComplete: () => void;
}

export function SetRow({ set, setNumber, onUpdate, onComplete }: SetRowProps) {
  const prDetails: string[] = [];
  if (set.absWeightPR) prDetails.push("Absolute weight PR");
  if (set.e1rmPR) prDetails.push("Estimated 1RM PR");
  if (set.volumePR) prDetails.push("Set volume PR");
  if (set.repPR) prDetails.push("Rep PR at this weight");
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border p-3 transition-colors",
        set.completed && "border-success/50 bg-success/5"
      )}
    >
      <span className="w-8 text-center text-sm font-medium text-muted-foreground">
        {setNumber}
      </span>

      <div className="flex flex-1 items-center gap-2">
        <div className="flex-1">
          <label className="sr-only">Weight</label>
          <Input
            type="number"
            placeholder="lbs"
            value={set.weight || ""}
            onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
            className="h-9 text-center"
          />
        </div>
        <span className="text-muted-foreground">×</span>
        <div className="flex-1">
          <label className="sr-only">Reps</label>
          <Input
            type="number"
            placeholder="reps"
            value={set.reps || ""}
            onChange={(e) => onUpdate({ reps: Number(e.target.value) })}
            className="h-9 text-center"
          />
        </div>
      </div>

      {set.isPR && prDetails.length > 0 ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="pr" size="icon" className="h-9 w-9">
              <Trophy className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Personal Record</DialogTitle>
              <DialogDescription>
                This set hit the following PR type(s):
              </DialogDescription>
            </DialogHeader>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {prDetails.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      ) : (
        <div className="h-9 w-9 flex items-center justify-center text-xs text-muted-foreground">
          -
        </div>
      )}

      <Button
        variant={set.completed ? "success" : "outline"}
        size="icon"
        className="h-9 w-9"
        onClick={onComplete}
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}
