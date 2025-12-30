import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Dumbbell, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { login, register } from "@/lib/api";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const isSignup = searchParams.get("signup") === "true";
  const [isLoading, setIsLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(isSignup);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (showSignup) {
        await register(formData.email, formData.password);
        try {
          localStorage.setItem(
            "user:profile",
            JSON.stringify({
              name: formData.name,
              email: formData.email,
            })
          );
        } catch {}
        toast({
          title: "Account created!",
          description: "Let's personalize your experience.",
        });
        navigate("/onboarding");
      } else {
        await login(formData.email, formData.password);
        try {
          const existing = localStorage.getItem("user:profile");
          if (existing) {
            const parsed = JSON.parse(existing) as {
              name?: string;
              email?: string;
            };
            localStorage.setItem(
              "user:profile",
              JSON.stringify({
                name: parsed.name || formData.name || "Strenghty User",
                email: formData.email,
              })
            );
          } else {
            localStorage.setItem(
              "user:profile",
              JSON.stringify({
                name: formData.name || "Strenghty User",
                email: formData.email,
              })
            );
          }
        } catch {}
        toast({
          title: "Welcome back!",
          description: "Logged in successfully.",
        });
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-white">
              Strenghty
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">
              {showSignup ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {showSignup
                ? "Start tracking your workouts and PRs"
                : "Log in to continue your fitness journey"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {showSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  "Loading..."
                ) : (
                  <>
                    {showSignup ? "Create Account" : "Log In"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              {showSignup ? (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setShowSignup(false)}
                    className="font-medium text-primary hover:underline"
                  >
                    Log in
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setShowSignup(true)}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
