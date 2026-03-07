import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
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
import { clearToken, deleteAccount, updateAccount } from "@/lib/api";

export default function AccountSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [accountEmail, setAccountEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
  }, []);

  const handleUpdateAccount = async () => {
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground" htmlFor="account-email">
                  Login Email
                </Label>
                <Input
                  id="account-email"
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground" htmlFor="current-password">
                  Current Password
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground" htmlFor="new-password">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground" htmlFor="confirm-password">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <Button onClick={handleUpdateAccount}>Update Account</Button>
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
                <p className="text-sm font-semibold text-white">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Permanently delete your account and all associated data. This cannot be undone.
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
