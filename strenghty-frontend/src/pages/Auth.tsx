import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  API_BASE,
  login,
  register,
  loginWithGoogle,
  setToken,
} from "@/lib/api";
import ConfirmEmailDialog from "@/components/ConfirmEmailDialog";
import InvalidCredentialsDialog from "@/components/InvalidCredentialsDialog";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

type AuthFormData = {
  name: string;
  email: string;
  password: string;
};

type AuthProps = {
  embedded?: boolean;
  defaultSignup?: boolean;
};

const MotionCard = motion(Card);

const authStepVariants = {
  enter: { opacity: 0, y: 24 },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -24,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
} as const;

const GOOGLE_CLIENT_ID_WEB_ENV = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "")
  .toString()
  .trim();
const GOOGLE_CLIENT_ID_ANDROID_ENV = (
  import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID ?? ""
)
  .toString()
  .trim();
const SUPABASE_URL_ENV = (import.meta.env.VITE_SUPABASE_URL ?? "")
  .toString()
  .trim();
const SUPABASE_ANON_KEY_ENV = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
  .toString()
  .trim();
const REDIRECT_ORIGIN = "https://strengthy-strengthy-frontend.vercel.app";
const GOOGLE_REDIRECT_TO = `${REDIRECT_ORIGIN}/auth`;

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

export default function Auth({
  embedded = false,
  defaultSignup,
}: AuthProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleSelecting, setIsGoogleSelecting] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | {
    kind: "login" | "signup" | "google";
    title: string;
    detail: string;
  }>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [invalidCredsOpen, setInvalidCredsOpen] = useState(false);
  const [confirmEmailOpen, setConfirmEmailOpen] = useState(false);
  const [confirmEmailAddress, setConfirmEmailAddress] = useState<string | null>(
    null,
  );
  const [showSignup, setShowSignup] = useState(Boolean(defaultSignup));
  const [googleClientIdAndroid, setGoogleClientIdAndroid] = useState<
    string | null
  >(GOOGLE_CLIENT_ID_ANDROID_ENV || GOOGLE_CLIENT_ID_WEB_ENV || null);
  const [formData, setFormData] = useState<AuthFormData>({
    name: "",
    email: "",
    password: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const shouldRouteToOnboarding = useCallback(
    async (accessToken: string): Promise<boolean> => {
      if (!SUPABASE_URL_ENV || !SUPABASE_ANON_KEY_ENV || !accessToken) {
        return false;
      }

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
        const rows = (await res.json()) as Array<{
          goals?: string[] | null;
          experience?: string | null;
          monthly_workouts?: number | null;
        }>;
        const profile = rows?.[0];
        if (!profile) return true;

        const hasGoals =
          Array.isArray(profile.goals) && profile.goals.length > 0;
        const hasExperience = !!String(profile.experience || "").trim();
        const hasMonthlyWorkouts =
          typeof profile.monthly_workouts === "number" &&
          profile.monthly_workouts > 0;

        return !(hasGoals || hasExperience || hasMonthlyWorkouts);
      } catch {
        return false;
      }
    },
    [],
  );

  const completeWebGoogleLogin = useCallback(
    async (
      accessToken: string,
      idToken?: string | null,
      forcePopupContext = false,
    ) => {
      if (!accessToken) return;

      const isPopupWindow =
        forcePopupContext ||
        (typeof window !== "undefined" &&
          window.sessionStorage?.getItem("supabase_oauth_popup") === "1") ||
        (typeof window !== "undefined" &&
          (!!window.opener || window.name === "supabase_google_oauth"));

      if (isPopupWindow) {
        try {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "supabase-oauth-result",
                accessToken,
                idToken: idToken || null,
              },
              "*",
            );
          }
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

      setToken(accessToken);
      try {
        if (idToken) {
          const payload = JSON.parse(
            atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
          );
          const profile = {
            name: payload?.name || null,
            email: payload?.email || null,
          };
          if (profile.name || profile.email) {
            localStorage.setItem("user:profile", JSON.stringify(profile));
          }
        }
      } catch {}
      const goOnboarding = await shouldRouteToOnboarding(accessToken);
      if (goOnboarding) {
        try {
          localStorage.removeItem("user:onboarding");
          localStorage.removeItem("user:monthlyGoal");
        } catch {}
      }

      toast({ title: "Welcome!", description: "Signed in with Google." });
      navigate(goOnboarding ? "/onboarding" : "/dashboard");
    },
    [navigate, shouldRouteToOnboarding, toast],
  );

  const openConfirmEmailDialog = useCallback((email?: string) => {
    const normalized = String(email || "").trim();
    setConfirmEmailAddress(normalized || null);
    setConfirmEmailOpen(true);
  }, []);

  const isEmailNotConfirmedError = useCallback((msg: string) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes("email_not_confirmed") ||
      lower.includes("email not confirmed")
    );
  }, []);

  const isInvalidCredentialsError = useCallback((msg: string) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes("invalid login credentials") ||
      lower.includes("invalid email") ||
      lower.includes("invalid password") ||
      lower.includes("incorrect password") ||
      lower.includes("login failed: 400") ||
      lower.includes("login failed: 401") ||
      lower.includes("no active account") ||
      lower.includes("unable to log in with provided credentials")
    );
  }, []);

  useEffect(() => {
    // Support /auth?signup=true deep links while keeping the inline (embedded)
    // Index flow in control via the `defaultSignup` prop.
    try {
      const params = new URLSearchParams(location.search);
      if (params.get("signup") === "true") {
        setShowSignup(true);
      }
    } catch {
      // ignore
    }
  }, [location.search]);

  useEffect(() => {
    // Resolve Android Google client id from env first; legacy backend config as fallback.
    (async () => {
      if (GOOGLE_CLIENT_ID_ANDROID_ENV || GOOGLE_CLIENT_ID_WEB_ENV) return;

      if (API_BASE.includes("supabase.co")) {
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/public-config/`);
        if (res.ok) {
          const data = await res.json();

          // Android client fallback for native builds
          if (data?.google_client_id_android) {
            setGoogleClientIdAndroid(String(data.google_client_id_android));
          }
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    // Supabase OAuth full-page callback handling
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const error = hash.get("error_description") || hash.get("error");

      if (error) {
        toast({
          title: "Google sign-in failed",
          description: String(error),
          variant: "destructive",
        });
        return;
      }

      const accessToken = (hash.get("access_token") || "").trim();
      if (!accessToken) return;
      const idToken = (hash.get("id_token") || "").trim() || null;
      const refreshToken = (hash.get("refresh_token") || "").trim();

      if (refreshToken && supabase) {
        void supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanUrl);
      void completeWebGoogleLogin(accessToken, idToken);
    } catch {
      // no-op
    }
  }, [completeWebGoogleLogin]);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setInvalidCredsOpen(false);

      if (!supabase) {
        toast({
          title: "Google sign-in failed",
          description: "Supabase Google auth is not configured. Check environment variables.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
      return;
    } catch (e: any) {
      toast({
        title: "Google sign-in failed",
        description: String(e?.message || e || "Google auth failed"),
        variant: "destructive",
      });
    }
  };

  // POST the Google credential to the backend, store token and profile
  const handleGoogleSuccess = async (credential: string) => {
    // Supabase-only exchange of Google ID token (native flow)
    return await loginWithGoogle(credential);
  };

  const onClickContinueWithGoogle = async () => {
    const isNative =
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.() === true;

    // --- WEB FLOW (GIS only) ---
    if (!isNative) {
      // Don't show the full-screen pending UI here; it should only show
      // after the user selects an account and we receive a credential.
      await handleGoogleLogin();
      return;
    }

    // --- NATIVE FLOW (Keep existing) ---
    try {
      const nativeClientId = (
        googleClientIdAndroid ||
        GOOGLE_CLIENT_ID_ANDROID_ENV ||
        GOOGLE_CLIENT_ID_WEB_ENV ||
        ""
      )
        .toString()
        .trim();

      if (!nativeClientId) {
        const msg = `Google sign-in isn't ready (missing Android/Web Google client id).`;
        toast({
          title: "Google sign-in failed",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      // On native, let the user pick the account first. Only show the
      // pending screen after we have an idToken to exchange.
      setIsGoogleSelecting(true);

      let initialized = false;

      // ✅ USE THIS NEW UPDATED BLOCK:
      try {
        await GoogleAuth.initialize({
          clientId: nativeClientId,
          scopes: ["profile", "email"],
          grantOfflineAccess: true,
          // 🔥 NEW: These two settings break the auto-login cache
          forceCodeForRefreshToken: true,
          authentication: {
            enableAutoSignIn: false,
          },
        });
        initialized = true;
      } catch (e) {
        console.warn("GoogleAuth initialize failed:", e);
      }

      if (!initialized) {
        toast({
          title: "Google sign-in failed",
          description: "Failed to initialize Google sign-in. Try again.",
          variant: "destructive",
        });
        setIsGoogleSelecting(false);
        return;
      }

      // 🔥 Force clear the current session before showing the list
      await GoogleAuth.signOut();
      // Tiny delay to ensure the OS processes the sign-out
      await new Promise((r) => setTimeout(r, 200));

      const res = await GoogleAuth.signIn();
      setIsGoogleSelecting(false);
      console.log("GoogleAuth.signIn response:", res);

      if (!res) {
        toast({
          title: "Google sign-in failed",
          description: "Google sign-in was cancelled or failed to start.",
          variant: "destructive",
        });
        return;
      }

      const idToken = res?.authentication?.idToken || res?.idToken;

      if (!idToken) {
        toast({
          title: "Google sign-in failed",
          description: "Google did not return an ID token.",
          variant: "destructive",
        });
        return;
      }

      setIsGoogleSelecting(false);

      setPendingAction({
        kind: "google",
        title: "Signing you in",
        detail: "Syncing your account…",
      });
      setIsLoading(true);

      try {
        const data = await loginWithGoogle(idToken);
        toast({ title: "Welcome!", description: "Signed in with Google" });
        const target = data?.created ? "/onboarding" : "/dashboard";
        navigate(target);
        return;
      } finally {
        setPendingAction(null);
        setIsLoading(false);
      }
    } catch (e) {
      setIsGoogleSelecting(false);
      const msg = String(
        (e as any)?.message || e || "Native Google sign-in failed",
      );
      let extra = "";
      try {
        const anyErr: any = e as any;
        const safe: any = {
          message: anyErr?.message,
          code: anyErr?.code,
          details: anyErr?.details,
        };
        extra = JSON.stringify(safe);
      } catch {}
      try {
        console.warn("Native GoogleAuth failed", e);
      } catch {}

      const hint =
        "If this keeps happening on Android, it's usually an OAuth config issue (missing SHA-1/SHA-256 for the debug keystore, wrong package name, or Google Play Services).";

      toast({
        title: "Google sign-in failed",
        description:
          `Google sign-in failed: ${msg}` +
          (extra ? `\n\nDetails: ${extra}` : "") +
          `\n\nAPI: ${API_BASE}` +
          `\n\nHint: ${hint}`,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kind = showSignup ? "signup" : "login";
    setPendingAction({
      kind,
      title: showSignup ? "Creating your account" : "Signing you in",
      detail: showSignup
        ? "Creating your account and preparing onboarding…"
        : "Verifying credentials and loading your data…",
    });
    setIsLoading(true);
    setAuthError(null);

    try {
      if (showSignup) {
        // Create the account
        await register(formData.email, formData.password);
        openConfirmEmailDialog(formData.email);
        toast({
          title: "Please confirm your email",
          description: "Check your inbox, then log in.",
        });
        setShowSignup(false);
        return;
      }

      // Login flow
      await login(formData.email, formData.password);
      toast({ title: "Welcome back", description: "Signed in." });
      navigate("/dashboard");
    } catch (err: any) {
      const msg = String(err?.message || err || "Authentication failed");
      if (isEmailNotConfirmedError(msg)) {
        setConfirmEmailAddress(formData.email || null);
        setConfirmEmailOpen(true);
        toast({
          title: "Please confirm your email",
          description: "Check your inbox, then try logging in again.",
        });
        return;
      }

      if (isInvalidCredentialsError(msg)) {
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

  return (
    <div
      className={`flex flex-col bg-background overflow-x-hidden ${
        embedded ? "h-full" : "h-screen"
      }`}
    >
      {!embedded && (
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
      )}

      <main
        className={`flex flex-1 items-center justify-center ${
          embedded ? "p-4" : "p-4"
        }`}
      >
        <div
          className={`w-full max-w-md transition-transform ${
            pendingAction
              ? "-translate-y-4 md:translate-y-[-9vh] lg:translate-y-[-6vh]"
              : ""
          }`}
        >
          <MotionCard
            className="w-full rounded-2xl overflow-hidden"
            layout
            transition={{
              layout: {
                duration: 0.28,
                ease: [0.25, 0.1, 0.25, 1],
              },
            }}
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
                    <div>
                      <p className="text-base font-semibold text-white">
                        {pendingAction.title}
                      </p>
                    </div>
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
                    layout: {
                      duration: 0.28,
                      ease: [0.25, 0.1, 0.25, 1],
                    },
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
                    {/* Google sign-in button */}
                    <div className="mb-4 flex justify-center">
                      <button
                        type="button"
                        onClick={onClickContinueWithGoogle}
                        disabled={isLoading || isGoogleSelecting}
                        className="inline-flex items-center rounded-md border border-white/40 px-4 py-2 text-sm text-white hover:bg-white/5"
                      >
                        <img
                          src="/google-logo.svg"
                          alt="Google"
                          className="mr-2 h-4 w-4"
                        />
                        {isGoogleSelecting
                          ? "Choose an account…"
                          : "Continue with Google"}
                      </button>
                    </div>
                    <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          or continue with email
                        </span>
                      </div>
                    </div>

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
                              className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                            className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                            className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                            required
                            minLength={6}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          "Loading..."
                        ) : (
                          <>
                            <>{showSignup ? "Create Account" : "Log In"}</>
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>

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
        </div>
        <InvalidCredentialsDialog
          open={invalidCredsOpen}
          setOpen={setInvalidCredsOpen}
        />

        <ConfirmEmailDialog
          open={confirmEmailOpen}
          setOpen={setConfirmEmailOpen}
          email={confirmEmailAddress}
        />
      </main>
    </div>
  );
}
