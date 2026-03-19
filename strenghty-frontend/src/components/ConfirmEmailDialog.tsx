import { Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ConfirmEmailDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  email?: string | null;
};

export default function ConfirmEmailDialog({
  open,
  setOpen,
  email,
}: ConfirmEmailDialogProps) {
  const hasEmail = !!String(email || "").trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 p-6 max-w-md w-full">
        <DialogHeader className="space-y-0">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg font-semibold text-white tracking-tight">
              Confirm your email
            </DialogTitle>
          </div>

          <DialogDescription className="mt-3 text-sm text-zinc-400 leading-relaxed break-words whitespace-pre-wrap">
            {hasEmail
              ? `We’ve sent a confirmation link to ${email}.\nPlease check your inbox and activate your account.`
              : "Please check your inbox and confirm your email before logging in."}
          </DialogDescription>

          <p className="mt-4 text-xs text-zinc-500">
            Didn&apos;t receive the email? Check your spam folder or try signing
            up again. Already have an account?{" "}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-orange-400 hover:underline"
            >
              Log in instead
            </button>
          </p>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
