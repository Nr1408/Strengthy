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
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState(
    "Authentication error",
  );
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
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

  const completeWebGoogleLogin = useCallback(
    (
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
              window.location.origin,
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
      toast({ title: "Welcome!", description: "Signed in with Google." });
      navigate("/dashboard");
    },
    [navigate, toast],
  );

  const openConfirmEmailDialog = useCallback((email?: string) => {
    setErrorDialogTitle("Please confirm your email");
    setDialogMessage(
      email
        ? `Please confirm your email (${email}) before logging in. Check your inbox and spam folder.`
        : "Please confirm your email before logging in. Check your inbox and spam folder.",
    );
    setErrorDialogOpen(true);
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
    const onPopupMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "supabase-oauth-result") return;
      const accessToken = String(e.data?.accessToken || "").trim();
      const idToken = e.data?.idToken ? String(e.data.idToken) : null;
      if (!accessToken) return;
      completeWebGoogleLogin(accessToken, idToken);
    };

    const channel = (() => {
      try {
        return new BroadcastChannel("supabase_oauth");
      } catch {
        return null;
      }
    })();

    const onChannelMessage = (event: MessageEvent) => {
      const payload: any = event?.data || {};
      if (payload?.type !== "supabase-oauth-result") return;
      const accessToken = String(payload?.accessToken || "").trim();
      const idToken = payload?.idToken ? String(payload.idToken) : null;
      if (!accessToken) return;
      completeWebGoogleLogin(accessToken, idToken);
    };

    window.addEventListener("message", onPopupMessage);
    if (channel) channel.addEventListener("message", onChannelMessage as any);

    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem("supabase:oauth_result");
        if (!raw) return;
        localStorage.removeItem("supabase:oauth_result");
        const parsed = JSON.parse(raw || "{}");
        const accessToken = String(parsed?.accessToken || "").trim();
        const idToken = parsed?.idToken ? String(parsed.idToken) : null;
        if (!accessToken) return;
        completeWebGoogleLogin(accessToken, idToken);
      } catch {}
    }, 500);

    return () => {
      window.removeEventListener("message", onPopupMessage);
      if (channel) {
        channel.removeEventListener("message", onChannelMessage as any);
        channel.close();
      }
      clearInterval(interval);
    };
  }, [completeWebGoogleLogin]);

  useEffect(() => {
    // Supabase OAuth web callback handling
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const error = hash.get("error_description") || hash.get("error");

      if (error) {
        setDialogMessage(`Google sign-in failed: ${error}`);
        setErrorDialogOpen(true);
        return;
      }

      if (!accessToken) return;
      const idToken = hash.get("id_token");

      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanUrl);
      completeWebGoogleLogin(accessToken, idToken);
    } catch {
      // no-op
    }
  }, [completeWebGoogleLogin]);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setDialogMessage(null);
      setErrorDialogOpen(false);

      const isNative =
        typeof window !== "undefined" &&
        (window as any).Capacitor?.isNativePlatform?.() === true;

      if (isNative) return;

      if (!SUPABASE_URL_ENV) {
        setDialogMessage(
          "Supabase Google auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        );
        setErrorDialogOpen(true);
        return;
      }

      const popupRedirectTo = `${window.location.origin}/oauth-popup.html`;
      const authorizeUrl =
        `${SUPABASE_URL_ENV.replace(/\/+$/g, "")}/auth/v1/authorize` +
        `?provider=google` +
        `&redirect_to=${encodeURIComponent(popupRedirectTo)}` +
        `&prompt=${encodeURIComponent("select_account consent")}`;

      const w = 520;
      const h = 680;
      const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open(
        "about:blank",
        "supabase_google_oauth",
        `width=${w},height=${h},left=${left},top=${top},noopener=false`,
      );

      if (!popup) {
        setDialogMessage(
          "Popup was blocked. Please allow popups for this site and try again.",
        );
        setErrorDialogOpen(true);
        return;
      }

      try {
        (popup as any).opener = window;
      } catch {}

      try {
        popup.sessionStorage.setItem("supabase_oauth_popup", "1");
      } catch {}

      try {
        popup.location.href = authorizeUrl;
      } catch {}
      return;
    } catch (e: any) {
      setDialogMessage(`Google sign-in failed: ${e?.message || e}`);
      setErrorDialogOpen(true);
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
      const friendlyInvalidCreds =
        !showSignup && isInvalidCredentialsError(msg)
          ? "Invalid email id or password, please try again"
          : msg;
      setAuthError(friendlyInvalidCreds);

      if (isEmailNotConfirmedError(msg)) {
        openConfirmEmailDialog(formData.email);
        toast({
          title: "Please confirm your email",
          description: "Check your inbox, then try logging in again.",
        });
        return;
      }

      setErrorDialogTitle("Authentication error");
      try {
        const deep = JSON.stringify(
          (err as any)?.response?.data ||
            (err as any)?.message ||
            friendlyInvalidCreds,
        );
        setDialogMessage(
          friendlyInvalidCreds === msg
            ? `Full Error: ${deep} | API: ${API_BASE}`
            : friendlyInvalidCreds,
        );
      } catch (e) {
        setDialogMessage(
          friendlyInvalidCreds === msg
            ? msg + `\nAPI: ${API_BASE}`
            : friendlyInvalidCreds,
        );
      }
      setErrorDialogOpen(true);
      toast({
        title: "Error",
        description: friendlyInvalidCreds,
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
        <Dialog
          open={errorDialogOpen}
          onOpenChange={(o) => setErrorDialogOpen(o)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{errorDialogTitle}</DialogTitle>
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
