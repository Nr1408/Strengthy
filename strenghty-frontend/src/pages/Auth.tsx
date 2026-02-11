import { useState, useEffect, useRef, useCallback } from "react";
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
import { API_BASE, login, register, loginWithGoogle } from "@/lib/api";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type AuthFormData = {
  name: string;
  email: string;
  password: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

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

export default function Auth({
  embedded = false,
  defaultSignup,
}: AuthProps = {}) {
  if (window.opener && window.location.pathname === "/auth/google/redirect") {
    return null;
  }

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleSelecting, setIsGoogleSelecting] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | {
    kind: "login" | "signup" | "google";
    title: string;
    detail: string;
  }>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(Boolean(defaultSignup));
  const [googleClientIdWeb, setGoogleClientIdWeb] = useState<string | null>(
    null,
  );
  const [googleClientIdAndroid, setGoogleClientIdAndroid] = useState<
    string | null
  >(null);
  const [formData, setFormData] = useState<AuthFormData>({
    name: "",
    email: "",
    password: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Prevent page-level scrolling while on the auth route. This guards against
  // programmatic focus or mobile browser UI adjustments causing the body to
  // scroll up/down while the auth card is visible.
  useEffect(() => {
    if (embedded) return;
    try {
      const html = document.documentElement;
      const body = document.body;
      const prevHtmlOverflow = html.style.overflow;
      const prevBodyOverflow = body.style.overflow;
      const prevHtmlHeight = html.style.height;
      const prevBodyHeight = body.style.height;

      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      html.style.height = "100vh";
      body.style.height = "100vh";

      return () => {
        html.style.overflow = prevHtmlOverflow;
        body.style.overflow = prevBodyOverflow;
        html.style.height = prevHtmlHeight;
        body.style.height = prevBodyHeight;
      };
    } catch (e) {
      // ignore in non-browser environments
    }
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
    const handler = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "google-credential") return;

      await processGoogleCredential(e.data.credential);
    };

    window.addEventListener("message", handler);

    // 🛟 Brave fallback polling
    const interval = setInterval(async () => {
      const stored = localStorage.getItem("google:credential");
      if (stored) {
        localStorage.removeItem("google:credential");
        await processGoogleCredential(stored);
      }
    }, 500);

    return () => {
      window.removeEventListener("message", handler);
      clearInterval(interval);
    };
  }, []);

  // Ref to ensure GSI is initialized only once
  const gsiInitializedRef = useRef(false);
  const waitForGsi = async (timeoutMs = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.google?.accounts?.id) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  };

  useEffect(() => {
    // fetch public config (google client id)
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public-config/`);
        if (res.ok) {
          const data = await res.json();

          // Web client
          if (data?.google_client_id_web) {
            setGoogleClientIdWeb(String(data.google_client_id_web));
          }

          // Android client
          if (data?.google_client_id_android) {
            setGoogleClientIdAndroid(String(data.google_client_id_android));
          }
        }
      } catch (e) {}
    })();
  }, []);

  const openGoogleOAuthPopup = () => {
    if (!googleClientIdWeb) return;

    const nonce = Math.random().toString(36).slice(2);

    const params = new URLSearchParams({
      client_id: googleClientIdWeb,
      redirect_uri:
        "https://strengthy-backend.up.railway.app/api/auth/google/redirect/",
      response_type: "id_token",
      response_mode: "form_post",
      scope: "openid email profile",
      prompt: "select_account",
      nonce,
    });

    const w = 500,
      h = 600;
    const y = window.top!.outerHeight / 2 + window.top!.screenY - h / 2;
    const x = window.top!.outerWidth / 2 + window.top!.screenX - w / 2;

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "google_oauth",
      `width=${w},height=${h},left=${x},top=${y},noopener=false`,
    );

    // Fallback in case opener gets stripped
    if (popup) {
      (popup as any).opener = window;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setDialogMessage(null);
      setErrorDialogOpen(false);

      const isNative =
        typeof window !== "undefined" &&
        (window as any).Capacitor?.isNativePlatform?.() === true;

      if (isNative) return;

      // ✅ ADD THIS BLOCK HERE
      if (!googleClientIdWeb) {
        setDialogMessage("Google Client ID still loading. Please try again.");
        setErrorDialogOpen(true);
        return;
      }

      const clientId = googleClientIdWeb.trim();

      const loaded = await waitForGsi();
      if (!loaded) {
        setDialogMessage("Google Identity Services failed to load.");
        setErrorDialogOpen(true);
        return;
      }

      if (!gsiInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredential,

          // Let Google choose the best available flow
          ux_mode: "popup",

          // REQUIRED for Chrome 2025+ and Incognito
          use_fedcm_for_prompt: true,

          auto_select: false,
          cancel_on_tap_outside: false,
        });

        gsiInitializedRef.current = true;
      }

      window.google.accounts.id.disableAutoSelect();

      window.google.accounts.id.prompt((notification: any) => {
        const reason = notification.getNotDisplayedReason?.();

        if (notification.isNotDisplayed?.()) {
          console.warn("Google Sign-In not displayed:", reason);
          if (
            reason === "opt_out_or_no_session" ||
            reason === "unknown_reason"
          ) {
            openGoogleOAuthPopup();
          }
        }

        if (notification.isSkippedMoment?.()) {
          console.warn(
            "Google Sign-In skipped:",
            notification.getSkippedReason?.(),
          );
        }
      });
    } catch (e: any) {
      setDialogMessage(`Google sign-in failed: ${e?.message || e}`);
      setErrorDialogOpen(true);
    }
  };

  const handleGoogleCredential = async (response: any) => {
    // If this runs inside popup — do NOTHING here
    if (window.opener) {
      console.log("Credential received inside popup — ignoring.");
      return;
    }

    const credential = response?.credential || response?.id_token;
    if (!credential) {
      setAuthError("No credential returned from Google.");
      return;
    }

    setPendingAction({
      kind: "google",
      title: "Signing you in",
      detail: "Connecting to Google and syncing your account…",
    });
    setIsLoading(true);

    try {
      const data = await handleGoogleSuccess(credential);

      toast({ title: "Welcome!", description: "Signed in with Google." });

      const target = data?.created ? "/onboarding" : "/dashboard";
      navigate(target);
    } catch (err: any) {
      const msg = String(err?.message || err || "Google sign-in failed");
      setDialogMessage(msg);
      setErrorDialogOpen(true);
    } finally {
      setPendingAction(null);
      setIsLoading(false);
    }
  };

  // POST the Google credential to the backend, store token and profile
  const handleGoogleSuccess = async (credential: string) => {
    // Use centralized helper so profile is persisted into Capacitor Preferences
    // for native builds as well.
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return await loginWithGoogle(credential);
  };

  const processGoogleCredential = useCallback(
    async (credential: string) => {
      // Only show the loading/pending UI AFTER the user has selected
      // an account and we have a credential to exchange with the backend.
      setPendingAction({
        kind: "google",
        title: "Signing you in",
        detail: "Finishing Google sign-in…",
      });
      setIsLoading(true);
      try {
        const data = await handleGoogleSuccess(credential);
        toast({ title: "Welcome!", description: "Signed in with Google." });
        const target = data?.created ? "/onboarding" : "/dashboard";
        navigate(target);
      } catch (err: any) {
        const msg = String(err?.message || err || "Google sign-in failed");
        setDialogMessage(msg + `\n\nAPI: ${API_BASE}`);
        setErrorDialogOpen(true);
        toast({
          title: "Google sign-in failed",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setPendingAction(null);
        setIsLoading(false);
      }
    },
    [navigate, toast],
  );

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
      if (!googleClientIdAndroid) {
        const msg = `Google sign-in isn't ready (missing Android client id).`;
        setDialogMessage(msg);
        setErrorDialogOpen(true);
        return;
      }

      // On native, let the user pick the account first. Only show the
      // pending screen after we have an idToken to exchange.
      setIsGoogleSelecting(true);

      let initialized = false;

      // ✅ USE THIS NEW UPDATED BLOCK:
      try {
        await GoogleAuth.initialize({
          clientId: googleClientIdWeb,
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
        setDialogMessage("Failed to initialize Google sign-in. Try again.");
        setErrorDialogOpen(true);
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
        setDialogMessage("Google sign-in was cancelled or failed to start.");
        setErrorDialogOpen(true);
        return;
      }

      const idToken = res?.authentication?.idToken || res?.idToken;

      if (!idToken) {
        setDialogMessage("Google did not return an ID token.");
        setErrorDialogOpen(true);
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

      setDialogMessage(
        `Google sign-in failed: ${msg}` +
          (extra ? `\n\nDetails: ${extra}` : "") +
          `\n\nAPI: ${API_BASE}` +
          `\n\nHint: ${hint}`,
      );
      setErrorDialogOpen(true);
      toast({
        title: "Google sign-in failed",
        description: msg,
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
        // After registering, log the user in automatically
        await login(formData.email, formData.password);
        toast({ title: "Account created", description: "Signed in." });
        // New accounts should complete onboarding (collect details)
        navigate("/onboarding");
        return;
      }

      // Login flow
      await login(formData.email, formData.password);
      toast({ title: "Welcome back", description: "Signed in." });
      navigate("/dashboard");
    } catch (err: any) {
      const msg = String(err?.message || err || "Authentication failed");
      setAuthError(msg);
      try {
        const deep = JSON.stringify(
          (err as any)?.response?.data || (err as any)?.message || msg,
        );
        setDialogMessage(`Full Error: ${deep} | API: ${API_BASE}`);
      } catch (e) {
        setDialogMessage(msg + `\nAPI: ${API_BASE}`);
      }
      setErrorDialogOpen(true);
      toast({ title: "Error", description: msg, variant: "destructive" });
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
            pendingAction ? "translate-y-0 md:translate-y-[-6vh]" : ""
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
                        disabled={
                          (!googleClientIdWeb && !googleClientIdAndroid) ||
                          isLoading ||
                          isGoogleSelecting
                        }
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
        <Dialog
          open={errorDialogOpen}
          onOpenChange={(o) => setErrorDialogOpen(o)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Authentication error</DialogTitle>
              <DialogDescription>
                {dialogMessage || "An error occurred during authentication."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      if (dialogMessage)
                        navigator.clipboard.writeText(dialogMessage);
                      toast({
                        title: "Copied",
                        description: "Error copied to clipboard.",
                      });
                    } catch (e) {}
                  }}
                >
                  Copy
                </Button>
                <Button
                  onClick={() => {
                    setErrorDialogOpen(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
