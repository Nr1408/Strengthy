import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MuscleTag from "@/components/workout/MuscleTag";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl bg-neutral-900/95 p-6 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {exerciseName || "Exercise"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Exercise details
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <div className="text-sm text-muted-foreground mb-2">Primary muscle</div>
          <MuscleTag muscle={String(muscleGroup || "other")} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
