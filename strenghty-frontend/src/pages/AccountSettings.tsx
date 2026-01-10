import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { clearToken, deleteAccount, updateAccount } from "@/lib/api";

export default function AccountSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [accountEmail, setAccountEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem("user:profile");
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as {
          name?: string;
          email?: string;
        };
        if (parsed.email) {
          setAccountEmail(parsed.email);
        }
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
          if (parsed.name) {
            name = parsed.name;
          }
        }
        localStorage.setItem(
          "user:profile",
          JSON.stringify({
            name,
            email: updatedEmail,
          })
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
    const confirmed = window.confirm(
      "This will permanently delete your account and all associated data in Strengthy. This action cannot be undone. Do you want to continue?"
    );
    if (!confirmed) return;

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

      navigate("/auth");
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Unable to delete your account.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 w-full px-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your login email, password, and account deletion.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/profile")}>
            Back to Profile
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Login & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-email">Login Email</Label>
                <Input
                  id="account-email"
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={handleUpdateAccount}>Update Account</Button>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
