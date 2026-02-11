import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type WorkoutInProgressDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
};

export default function WorkoutInProgressDialog({
  open,
  onOpenChange,
  onResume,
}: WorkoutInProgressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        className="w-[92vw] max-w-md rounded-[20px] border border-white/10 bg-neutral-900/90 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        hideClose
      >
        <DialogHeader className="items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Info className="h-5 w-5" />
          </div>
          <DialogTitle className="mt-3 text-xl font-semibold text-white">
            Workout Already In Progress
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            You currently have an active workout. Please resume or discard it
            before starting a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            className="flex-1 rounded-xl"
            onClick={() => {
              onOpenChange(false);
              onResume();
            }}
          >
            Resume Workout
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-white/20 text-white hover:bg-white/5"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
