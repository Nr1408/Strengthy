import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type InvalidCredentialsDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function InvalidCredentialsDialog({
  open,
  setOpen,
}: InvalidCredentialsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-zinc-900 border border-red-500/20 rounded-2xl shadow-2xl shadow-black/60 p-6 max-w-md w-full">
        <DialogHeader className="space-y-0">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <DialogTitle className="text-lg font-semibold text-white tracking-tight">
              Authentication error
            </DialogTitle>
          </div>

          <DialogDescription className="mt-3 text-sm text-zinc-400 leading-relaxed break-words whitespace-pre-wrap">
            Invalid email or password. Please try again.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
