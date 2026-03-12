import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
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
import { createClient } from "@supabase/supabase-js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      );

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://strengthy-strengthy-frontend.vercel.app/auth",
      });

      if (error) {
        throw error;
      }

      setSent(true);
      toast({
        title: "Check your inbox",
        description: `We've sent a password reset link to ${email}.`,
      });
    } catch (err: any) {
      toast({
        title: "Could not send reset link",
        description: err?.message || "Please try again.",
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
        <Card className="w-full max-w-md rounded-2xl overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">
              Forgot password
            </CardTitle>
            <CardDescription>
              Enter your email and we'll send you a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {!sent ? (
              <form onSubmit={handleSendResetLink} className="space-y-4">
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
                  {isLoading ? "Sending..." : "Send reset link"}
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
              <div className="space-y-4">
                <p className="text-center">
                  Check your inbox. We've sent a password reset link to {email}.
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  <Link
                    to="/auth"
                    className="font-medium text-primary hover:underline"
                  >
                    Back to login
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
