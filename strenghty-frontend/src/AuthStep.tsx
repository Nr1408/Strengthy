import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import {
  login,
  register,
  setToken,
  getToken,
  fetchAndPersistProfile,
} from "@/lib/api";
import ConfirmEmailDialog from "@/components/ConfirmEmailDialog";
import InvalidCredentialsDialog from "@/components/InvalidCredentialsDialog";
import { createClient } from "@supabase/supabase-js";
import { Browser } from "@capacitor/browser";

type AuthFormData = { name: string; email: string; password: string };
type Props = { defaultSignup?: boolean };

const MotionCard = motion(Card);

const authStepVariants = {
  enter: { opacity: 0, y: 24 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    y: -24,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },
} as const;

const SUPABASE_URL_ENV = (import.meta.env.VITE_SUPABASE_URL ?? "")
  .toString()
  .trim();
const SUPABASE_ANON_KEY_ENV = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
  .toString()
  .trim();
const GOOGLE_REDIRECT_TO_NATIVE = "com.strengthy.app://auth";

const supabase =
  SUPABASE_URL_ENV && SUPABASE_ANON_KEY_ENV
    ? createClient(SUPABASE_URL_ENV, SUPABASE_ANON_KEY_ENV, {
        auth: {
          flowType: "implicit",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export function AuthStep({ defaultSignup = true }: Props) {
  const [showSignup, setShowSignup] = useState(defaultSignup);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | {
    kind: string;
    title: string;
  }>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [invalidCredsOpen, setInvalidCredsOpen] = useState(false);
  const [confirmEmailOpen, setConfirmEmailOpen] = useState(false);
  const [confirmEmailAddress, setConfirmEmailAddress] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState<AuthFormData>({
    name: "",
    email: "",
    password: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const shouldRouteToOnboarding = useCallback(
    async (accessToken: string): Promise<boolean> => {
      try {
        const raw = localStorage.getItem("user:onboarding");
        if (raw) {
          const parsed = JSON.parse(raw) as any;
          const hasGoal = !!String(
            parsed?.goal || parsed?.goals?.[0] || "",
          ).trim();
          const hasExperience = !!String(parsed?.experience || "").trim();
          return !(hasGoal && hasExperience);
        }
      } catch {}
      if (!SUPABASE_URL_ENV || !SUPABASE_ANON_KEY_ENV || !accessToken)
        return false;
      try {
        const payload = JSON.parse(
          atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        );
        const userId = String(payload?.sub || "").trim();
        if (!userId) return false;
        const base = SUPABASE_URL_ENV.replace(/\/+$/g, "");
        const res = await fetch(
          `${base}/rest/v1/profiles?select=goals,experience,monthly_workouts&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY_ENV,
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        if (!res.ok) return false;
        const rows = await res.json();
        const profile = rows?.[0];
        if (!profile) return true;
        return !(
          Array.isArray(profile.goals) &&
          profile.goals.length > 0 &&
          !!String(profile.experience || "").trim()
        );
      } catch {
        return false;
      }
    },
    [],
  );

  const completeWebGoogleLogin = useCallback(
    async (accessToken: string, idToken?: string | null) => {
      if (!accessToken) return;
      const isPopupWindow =
        typeof window !== "undefined" &&
        (window.sessionStorage?.getItem("supabase_oauth_popup") === "1" ||
          !!window.opener ||
          window.name === "supabase_google_oauth");

      if (isPopupWindow) {
        try {
          if (window.opener)
            window.opener.postMessage(
              {
                type: "supabase-oauth-result",
                accessToken,
                idToken: idToken || null,
              },
              "*",
            );
        } catch {}
        try {
          localStorage.setItem(
            "supabase:oauth_result",
            JSON.stringify({ accessToken, idToken: idToken || null }),
          );
        } catch {}
        try {
          const ch = new BroadcastChannel("supabase_oauth");
          ch.postMessage({
            type: "supabase-oauth-result",
            accessToken,
            idToken: idToken || null,
          });
          ch.close();
        } catch {}
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 80);
        return;
      }

      setPendingAction({ kind: "google", title: "Signing you in" });
      setIsLoading(true);
      try {
        setToken(accessToken);
        try {
          await fetchAndPersistProfile();
        } catch {}
        try {
          if (SUPABASE_URL_ENV && SUPABASE_ANON_KEY_ENV) {
            const payload = JSON.parse(
              atob(
                accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
              ),
            );
            const userId = String(payload?.sub || "").trim();
            if (userId) {
              const base = SUPABASE_URL_ENV.replace(/\/+$/g, "");
              const res = await fetch(
                `${base}/rest/v1/profiles?select=goals,experience,monthly_workouts&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
                {
                  headers: {
                    apikey: SUPABASE_ANON_KEY_ENV,
                    Authorization: `Bearer ${accessToken}`,
                  },
                },
              );
              if (res.ok) {
                const rows = await res.json();
                const profile = rows?.[0];
                if (profile) {
                  const hasGoals =
                    Array.isArray(profile.goals) && profile.goals.length > 0;
                  const hasExperience = !!String(
                    profile.experience || "",
                  ).trim();
                  if (hasGoals && hasExperience) {
                    localStorage.setItem(
                      "user:onboarding",
                      JSON.stringify({
                        goal: profile.goals?.[0] || "",
                        experience: profile.experience || "",
                      }),
                    );
                  } else {
                    localStorage.removeItem("user:onboarding");
                  }
                }
              }
            }
          }
        } catch {}
        try {
          let profileName: string | null = null;
          let profileEmail: string | null = null;
          if (idToken) {
            const decoded = JSON.parse(
              atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
            );
            profileName = decoded?.name || null;
            profileEmail = decoded?.email || null;
          }
          if (
            !profileName &&
            !profileEmail &&
            SUPABASE_URL_ENV &&
            SUPABASE_ANON_KEY_ENV
          ) {
            const res = await fetch(
              `${SUPABASE_URL_ENV.replace(/\/+$/, "")}/auth/v1/user`,
              {
                headers: {
                  apikey: SUPABASE_ANON_KEY_ENV,
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
            if (res.ok) {
              const user = await res.json();
              profileName =
                user?.user_metadata?.full_name ||
                user?.user_metadata?.name ||
                null;
              profileEmail = user?.email || null;
            }
          }
          if (profileName || profileEmail) {
            localStorage.setItem(
              "user:profile",
              JSON.stringify({ name: profileName, email: profileEmail }),
            );
          }
        } catch {}

        const goOnboarding = await shouldRouteToOnboarding(accessToken);
        if (goOnboarding) {
          try {
            localStorage.removeItem("user:onboarding");
            localStorage.removeItem("user:monthlyGoal");
          } catch {}
        }
        if (!goOnboarding)
          toast({
            title: "Welcome back",
            description: "Signed in with Google.",
          });
        window.location.replace(goOnboarding ? "/onboarding" : "/dashboard");
      } finally {
        setPendingAction(null);
        setIsLoading(false);
      }
    },
    [navigate, shouldRouteToOnboarding, toast],
  );

  // Native deep link listener
  useEffect(() => {
    const isNative =
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.() === true;
    if (!isNative) return;
    let removeListener: (() => void) | null = null;
    (async () => {
      try {
        const appMod = await import("@capacitor/app");
        const listener = await appMod.App.addListener(
          "appUrlOpen",
          async (event) => {
            const incomingUrl = String(event?.url || "");
            if (!incomingUrl.startsWith(GOOGLE_REDIRECT_TO_NATIVE)) return;
            setPendingAction({ kind: "google", title: "Signing you in" });
            setIsLoading(true);
            try {
              const parsed = new URL(incomingUrl);
              const hash = new URLSearchParams(
                String(parsed.hash || "").replace(/^#/, ""),
              );
              const error = hash.get("error_description") || hash.get("error");
              if (error) {
                toast({
                  title: "Google sign-in failed",
                  description: String(error),
                  variant: "destructive",
                });
                setPendingAction(null);
                setIsLoading(false);
                return;
              }
              const accessToken = (hash.get("access_token") || "").trim();
              if (!accessToken) {
                setPendingAction(null);
                setIsLoading(false);
                return;
              }
              const idToken = (hash.get("id_token") || "").trim() || null;
              const refreshToken = (hash.get("refresh_token") || "").trim();
              if (refreshToken && supabase)
                void supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
              try {
                await Browser.close();
              } catch {}
              void completeWebGoogleLogin(accessToken, idToken);
            } catch {
              setPendingAction(null);
              setIsLoading(false);
            }
          },
        );
        removeListener = () => {
          try {
            listener.remove();
          } catch {}
        };
      } catch {}
    })();
    return () => {
      if (removeListener) removeListener();
    };
  }, [completeWebGoogleLogin, toast]);

  const handleGoogleLogin = async () => {
    const isNative =
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.() === true;
    if (isNative) return;
    try {
      setAuthError(null);
      setInvalidCredsOpen(false);
      if (!supabase) {
        toast({
          title: "Google sign-in failed",
          description: "Supabase not configured.",
          variant: "destructive",
        });
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({
        title: "Google sign-in failed",
        description: String(e?.message || e || "Google auth failed"),
        variant: "destructive",
      });
    }
  };

  const onClickContinueWithGoogle = async () => {
    const isNative =
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.() === true;
    if (!isNative) {
      await handleGoogleLogin();
      return;
    }
    if (!supabase) {
      toast({
        title: "Google sign-in failed",
        description: "Supabase is not configured.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: GOOGLE_REDIRECT_TO_NATIVE,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      if (data?.url) await Browser.open({ url: data.url });
    } catch (e: any) {
      toast({
        title: "Google sign-in failed",
        description: String(e?.message || e || "Google sign-in failed"),
        variant: "destructive",
      });
    }
  };

  const isEmailNotConfirmedError = (msg: string) => {
    const l = msg.toLowerCase();
    return (
      l.includes("not confirmed") ||
      l.includes("user not confirmed") ||
      l.includes("email not verified") ||
      l.includes("verify your email") ||
      l.includes("email address not confirmed")
    );
  };
  const isGoogleAccountError = (msg: string) => {
    const l = msg.toLowerCase();
    return (
      l.includes("provider") ||
      l.includes("identity provider") ||
      l.includes("oauth") ||
      l.includes("google") ||
      l.includes("social") ||
      l.includes("linked to a social")
    );
  };
  const isInvalidCredentialsError = (msg: string) => {
    const l = msg.toLowerCase();
    return (
      l.includes("invalid login credentials") ||
      l.includes("invalid email") ||
      l.includes("invalid password") ||
      l.includes("incorrect password") ||
      l.includes("login failed: 400") ||
      l.includes("login failed: 401") ||
      l.includes("no active account") ||
      l.includes("unable to log in with provided credentials")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPendingAction({
      kind: showSignup ? "signup" : "login",
      title: showSignup ? "Creating your account" : "Signing you in",
    });
    setIsLoading(true);
    setAuthError(null);
    try {
      if (showSignup) {
        await register(formData.email, formData.password);
        try {
          localStorage.setItem("auth:isNewUser", "1");
        } catch {}
        setConfirmEmailAddress(formData.email.trim() || null);
        setConfirmEmailOpen(true);
        toast({
          title: "Please confirm your email",
          description: "Check your inbox, then log in.",
        });
        setShowSignup(false);
        return;
      }
      await login(formData.email, formData.password);
      try {
        const isNewUser = localStorage.getItem("auth:isNewUser") === "1";
        if (isNewUser) {
          try {
            localStorage.removeItem("auth:isNewUser");
            localStorage.removeItem("user:onboarding");
            localStorage.removeItem("user:monthlyGoal");
          } catch {}
          navigate("/onboarding");
          return;
        }
        const token = getToken();
        const goOnboarding = token
          ? await shouldRouteToOnboarding(token)
          : false;
        if (!goOnboarding)
          toast({ title: "Welcome back", description: "Signed in." });
        window.location.replace(goOnboarding ? "/onboarding" : "/dashboard");
      } catch {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = String(err?.message || err || "Authentication failed");
      if (showSignup) {
        const lower = msg.toLowerCase();
        const emailExists =
          lower.includes("already registered") ||
          lower.includes("already exists") ||
          lower.includes("user already") ||
          lower.includes("email already") ||
          lower.includes("duplicate") ||
          lower.includes("already in use") ||
          lower.includes("422") ||
          lower.includes("registered");
        if (emailExists) {
          setInvalidCredsOpen(true);
          return;
        }
        setConfirmEmailAddress(formData.email.trim() || null);
        setConfirmEmailOpen(true);
        return;
      }
      if (isEmailNotConfirmedError(msg)) {
        setConfirmEmailAddress(formData.email?.trim() || null);
        setConfirmEmailOpen(true);
        return;
      } else if (isGoogleAccountError(msg)) {
        setInvalidCredsOpen(true);
        return;
      } else if (isInvalidCredentialsError(msg)) {
        setInvalidCredsOpen(true);
        return;
      }
      setAuthError("Authentication failed. Please try again.");
      toast({
        title: "Authentication error",
        description: "Authentication failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const activeStep = showSignup ? "signup" : "login";

  // ---- THIS IS THE ONLY THING THAT CHANGES vs Auth.tsx ----
  // No h-screen, no flex-col wrapper, no internal header — just the card
  return (
    <div className="w-full max-w-md mx-auto px-4">
      <MotionCard
        className="w-full rounded-2xl overflow-hidden border border-white/10"
        layout
        transition={{ layout: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } }}
      >
        {pendingAction ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="font-heading text-2xl">
                Just a moment
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              <div className="py-5 sm:py-8 text-center space-y-3">
                <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-base font-semibold text-white">
                  {pendingAction.title}
                </p>
              </div>
            </CardContent>
          </>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeStep}
              variants={authStepVariants}
              layout
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                layout: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
              }}
            >
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
              <CardContent className="px-6 pb-6">
                {/* Google */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={onClickContinueWithGoogle}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-zinc-800 text-white font-semibold text-sm border border-white/25 hover:bg-zinc-700 transition-colors"
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
                </div>

                {/* Divider */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      or continue with email
                    </span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {showSignup && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                        <Input
                          id="name"
                          name="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="pl-10 border border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10 border border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 border border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                        required
                        minLength={6}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full min-h-[44px] sm:min-h-[40px]"
                    disabled={isLoading}
                  >
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

                {/* Toggle + forgot */}
                <div
                  className={
                    showSignup
                      ? "mt-4 text-center text-sm"
                      : "mt-4 space-y-2 text-center text-sm sm:flex sm:items-center sm:justify-between sm:space-y-0"
                  }
                >
                  {!showSignup && (
                    <Link
                      to="/auth/forgot-password"
                      className="text-muted-foreground hover:text-primary hover:underline sm:text-left"
                    >
                      Forgot password?
                    </Link>
                  )}
                  <div
                    className={
                      showSignup
                        ? "text-muted-foreground"
                        : "text-muted-foreground sm:text-right sm:flex-1"
                    }
                  >
                    {showSignup ? (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setShowSignup(false)}
                          className="font-medium text-primary hover:underline"
                        >
                          Log in
                        </button>
                      </>
                    ) : (
                      <>
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setShowSignup(true)}
                          className="font-medium text-primary hover:underline"
                        >
                          Sign up
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </motion.div>
          </AnimatePresence>
        )}
      </MotionCard>

      <InvalidCredentialsDialog
        open={invalidCredsOpen}
        setOpen={setInvalidCredsOpen}
        onGoogleSignIn={onClickContinueWithGoogle}
      />
      <ConfirmEmailDialog
        open={confirmEmailOpen}
        setOpen={setConfirmEmailOpen}
        email={confirmEmailAddress}
      />
    </div>
  );
}
