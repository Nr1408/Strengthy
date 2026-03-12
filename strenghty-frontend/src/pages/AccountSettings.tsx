import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { clearToken, deleteAccount, getToken, updateAccount } from "@/lib/api";

export default function AccountSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [accountEmail, setAccountEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    try {
      const token = getToken();
      if (!token) return;
      const parts = token.split(".");
      if (parts.length !== 3) return;
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      const provider =
        payload?.app_metadata?.provider ||
        payload?.app_metadata?.providers?.[0] ||
        null;
      if (provider === "google") setIsGoogleAccount(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem("user:profile");
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as {
          name?: string;
          email?: string;
        };
        if (parsed.email) setAccountEmail(parsed.email);
      }
    } catch {}
    // If we don't have an email in localStorage but Supabase env is available,
    // try to fetch the user info from Supabase auth endpoint so email shows up
    // in Account Settings even after email/password sign up.
    (async () => {
      try {
        if (accountEmail) return;
        const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").toString().trim();
        const supabaseAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").toString().trim();
        const token = getToken();
        if (!supabaseUrl || !supabaseAnon || !token) return;
        const res = await fetch(`${supabaseUrl.replace(/\/+$/g, "")}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnon },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.email) setAccountEmail(data.email);
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleUpdateAccount = async () => {
    if (isGoogleAccount) return;
    if (!currentPassword) {
      toast({
        title: "Current password required",
        description: "Enter your current password to update account settings.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await updateAccount({
        email: accountEmail || undefined,
        currentPassword,
        newPassword: newPassword || undefined,
      });

      const updatedEmail = result.email || accountEmail;

      try {
        const rawProfile = localStorage.getItem("user:profile");
        let name = "Strenghty User";
        if (rawProfile) {
          const parsed = JSON.parse(rawProfile) as { name?: string };
          if (parsed.name) name = parsed.name;
        }
        localStorage.setItem(
          "user:profile",
          JSON.stringify({ name, email: updatedEmail }),
        );
      } catch {}

      toast({
        title: "Account updated",
        description: "Your login details were updated.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "Unable to update account settings.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      await deleteAccount();

      try {
        clearToken();
        localStorage.removeItem("user:profile");
        localStorage.removeItem("user:onboarding");
        localStorage.removeItem("user:monthlyGoal");
      } catch {}

      toast({
        title: "Account deleted",
        description: "Your account has been permanently removed.",
      });

      setDeleteConfirmOpen(false);
      navigate("/auth");
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Unable to delete your account.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <AppLayout>
      <div className="w-full max-w-2xl mx-auto px-4 pb-32 space-y-6">
        {/* Header */}
        <div className="pt-6 pb-2">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Profile
          </button>
          <h1 className="text-2xl font-bold text-white">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your login email, password, and account deletion.
          </p>
        </div>

        {/* Login & Security */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Login & Security
          </h2>
          <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
            {isGoogleAccount && (
              <div className="flex items-start gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                <div className="shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 18 18">
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
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Signed in with Google
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Your account uses Google for authentication. Password
                    management is handled by Google — you can't set or change a
                    password here.
                  </p>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  className="text-xs text-muted-foreground"
                  htmlFor="account-email"
                >
                  Login Email
                </Label>
                <Input
                  id="account-email"
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  readOnly={isGoogleAccount}
                  disabled={isGoogleAccount}
                  className={
                    isGoogleAccount ? "opacity-50 cursor-not-allowed" : ""
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs text-muted-foreground"
                  htmlFor="current-password"
                >
                  Current Password
                </Label>
                <div className="flex items-center">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isGoogleAccount}
                    placeholder={
                      isGoogleAccount ? "Not available for Google accounts" : ""
                    }
                    className={
                      isGoogleAccount ? "opacity-50 cursor-not-allowed" : ""
                    }
                  />
                  <button
                    type="button"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowCurrentPassword((s) => !s)}
                    className="ml-2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs text-muted-foreground"
                  htmlFor="new-password"
                >
                  New Password
                </Label>
                <div className="flex items-center">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    disabled={isGoogleAccount}
                    placeholder={
                      isGoogleAccount ? "Not available for Google accounts" : ""
                    }
                    className={
                      isGoogleAccount ? "opacity-50 cursor-not-allowed" : ""
                    }
                  />
                  <button
                    type="button"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowNewPassword((s) => !s)}
                    className="ml-2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs text-muted-foreground"
                  htmlFor="confirm-password"
                >
                  Confirm New Password
                </Label>
                <div className="flex items-center">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    disabled={isGoogleAccount}
                    placeholder={
                      isGoogleAccount ? "Not available for Google accounts" : ""
                    }
                    className={
                      isGoogleAccount ? "opacity-50 cursor-not-allowed" : ""
                    }
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="ml-2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                onClick={handleUpdateAccount}
                disabled={isGoogleAccount}
                className={
                  isGoogleAccount ? "opacity-50 cursor-not-allowed" : ""
                }
              >
                Update Account
              </Button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Danger Zone
          </h2>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  Delete Account
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Permanently delete your account and all associated data. This
                  cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </section>

        <AlertDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => {
            if (!isDeletingAccount) setDeleteConfirmOpen(open);
          }}
        >
          <AlertDialogContent className="w-[92vw] max-w-md rounded-2xl border border-destructive/35 bg-neutral-950 text-white p-5">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-left text-xl font-bold text-white">
                Delete Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left text-sm leading-relaxed text-zinc-300">
                This will permanently delete your account and all associated
                data in Strengthy. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2 flex-row justify-end gap-2 sm:space-x-0">
              <AlertDialogCancel
                className="mt-0 border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800"
                disabled={isDeletingAccount}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isDeletingAccount) {
                    void handleDeleteAccount();
                  }
                }}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? "Deleting..." : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
