import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  setOpen: (val: boolean) => void;
  isGoogleAccount?: boolean;
  onGoogleSignIn?: () => void;
}

export default function InvalidCredentialsDialog({
  open,
  setOpen,
  isGoogleAccount = false,
  onGoogleSignIn,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {isGoogleAccount
              ? "Use Google to sign in"
              : "Incorrect credentials"}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400 mt-1">
            {isGoogleAccount
              ? "This email is linked to a Google account. You can't sign in with a password — use the Google button instead."
              : "The email or password you entered is incorrect. Please try again or reset your password."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          {isGoogleAccount && onGoogleSignIn ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onGoogleSignIn();
                }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-zinc-800 text-white font-semibold text-sm border border-white/15 hover:bg-zinc-700 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.826.957 4.039l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white font-semibold hover:bg-zinc-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
