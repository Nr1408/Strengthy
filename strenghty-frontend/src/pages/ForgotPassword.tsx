import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, KeyRound, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  confirmPasswordReset,
  requestPasswordReset,
  API_BASE,
} from "@/lib/api";

export default function ForgotPassword() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await requestPasswordReset(email);
      toast({
        title: "Check your email",
        description:
          res.otp && import.meta.env.DEV
            ? `Use this code to reset your password: ${res.otp}`
            : "If an account exists for this email, we've sent a code.",
      });
      setStep("reset");
    } catch (err: any) {
      toast({
        title: "Could not start reset",
        description: `${err?.message || "Please try again."}\nAPI: ${API_BASE}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both password fields match.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const msg = await confirmPasswordReset(email, otp, password);
      toast({ title: "Password reset", description: msg });
      navigate("/auth");
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: `${
          err?.message || "Unable to reset password."
        }\nAPI: ${API_BASE}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="flex h-16 items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg">
              <img
                src="/icons/logo.png"
                alt="Strengthy logo"
                className="h-9 w-9 rounded-lg"
              />
            </div>
            <span className="font-heading text-xl font-bold text-white">
              Strengthy
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">
              {step === "email" ? "Forgot password" : "Reset your password"}
            </CardTitle>
            <CardDescription>
              {step === "email"
                ? "Enter your email and we'll send you a one-time code."
                : "Enter the code you received and choose a new password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending code..." : "Send reset code"}
                </Button>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Remembered your password?{" "}
                  <Link
                    to="/auth"
                    className="font-medium text-primary hover:underline"
                  >
                    Back to login
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">One-time code</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                    <Input
                      id="otp"
                      name="otp"
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    "Resetting..."
                  ) : (
                    <>
                      Reset password
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Back to{" "}
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="font-medium text-primary hover:underline"
                  >
                    Resend Code
                  </button>{" "}
                  or{" "}
                  <Link
                    to="/auth"
                    className="font-medium text-primary hover:underline"
                  >
                    Login
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
