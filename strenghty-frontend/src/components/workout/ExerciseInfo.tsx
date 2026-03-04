import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MuscleTag from "@/components/workout/MuscleTag";
import { getExerciseIconFile } from "@/lib/exerciseIcons";

type ExerciseInfoProps = {
  exerciseId?: string | null;
  exerciseName?: string | null;
  muscleGroup?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ExerciseInfo({
  exerciseName,
  muscleGroup,
  open,
  onOpenChange,
}: ExerciseInfoProps) {
  const name = String(exerciseName || "Exercise").trim() || "Exercise";
  const muscle = String(muscleGroup || "other").trim() || "other";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md rounded-2xl bg-zinc-900/95 border border-white/10 p-5">
        <DialogHeader className="space-y-3">
          <div className="mx-auto h-20 w-20 rounded-xl border border-white/10 bg-zinc-800 flex items-center justify-center">
            <img
              src={`/icons/${getExerciseIconFile(name, muscle)}`}
              alt={name}
              className="h-14 w-14 object-contain"
            />
          </div>
          <DialogTitle className="text-center text-white text-xl">{name}</DialogTitle>
          <div className="flex justify-center">
            <MuscleTag muscle={muscle as any} />
          </div>
          <DialogDescription className="text-center text-muted-foreground">
            Exercise details are now available on the Exercise Info page from history.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
