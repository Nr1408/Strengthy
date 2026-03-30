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
  setToken,
  getToken,
  fetchAndPersistProfile,
} from "@/lib/api";
import ConfirmEmailDialog from "@/components/ConfirmEmailDialog";
import InvalidCredentialsDialog from "@/components/InvalidCredentialsDialog";
import { createClient } from "@supabase/supabase-js";
import { Browser } from "@capacitor/browser";

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
const API_BASE_ENV = (
  import.meta.env.VITE_API_BASE ??
  import.meta.env.VITE_API_URL ??
  ""
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
const GOOGLE_REDIRECT_TO_NATIVE = "com.strengthy.app://auth";

const sanitizeGoogleClientId = (value: unknown): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (normalized.toLowerCase().includes("replace_with")) return "";
  if (normalized.includes("<") || normalized.includes(">")) return "";
  return normalized;
};

const normalizeApiRoot = (raw: string): string => {
  const trimmed = String(raw || "")
    .trim()
    .replace(/\/+$/g, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

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
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(
    null,
  );
  const [recoveryRefreshToken, setRecoveryRefreshToken] = useState<
    string | null
  >(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [showSignup, setShowSignup] = useState(Boolean(defaultSignup));

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
      // If we already synced onboarding into localStorage during login,
      // prefer that cached value to avoid an extra remote lookup and ensure
      // the app behaves consistently for non-Supabase backends.
      try {
        const raw = localStorage.getItem("user:onboarding");
        if (raw) {
          const parsed = JSON.parse(raw as string) as any;
          const hasGoal = !!String(
            parsed?.goal || parsed?.goals?.[0] || "",
          ).trim();
          const hasExperience = !!String(parsed?.experience || "").trim();
          return !(hasGoal && hasExperience);
        }
      } catch (e) {
        // fall through to remote checks
      }

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

        // Only skip onboarding when the user has both goals AND experience
        return !(hasGoals && hasExperience);
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

      setPendingAction({
        kind: "google",
        title: "Signing you in",
        detail: "Syncing your account…",
      });
      setIsLoading(true);
      try {
        setToken(accessToken);
        try {
          await fetchAndPersistProfile();
        } catch {}
        // Force-sync onboarding state from Supabase so localStorage
        // is always populated before shouldRouteToOnboarding reads it
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
                    // Write to localStorage so future checks are instant
                    localStorage.setItem(
                      "user:onboarding",
                      JSON.stringify({
                        goal: profile.goals?.[0] || "",
                        experience: profile.experience || "",
                      }),
                    );
                  } else {
                    // Clear stale data so shouldRouteToOnboarding sends to onboarding
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

          // Native flow: idToken is available, decode it directly
          if (idToken) {
            const decoded = JSON.parse(
              atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
            );
            profileName = decoded?.name || null;
            profileEmail = decoded?.email || null;
          }

          // Web OAuth flow: Supabase does not return idToken in the URL hash,
          // so we fetch the user record directly using the access token instead.
          if (
            !profileName &&
            !profileEmail &&
            SUPABASE_URL_ENV &&
            SUPABASE_ANON_KEY_ENV
          ) {
            try {
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
            } catch {}
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

        // Only show the welcome toast for returning users routed to the
        // dashboard. New users being sent to onboarding should not see the
        // generic welcome toast.
        if (!goOnboarding) {
          toast({
            title: "Welcome back",
            description: "Signed in with Google.",
          });
        }
        navigate(goOnboarding ? "/onboarding" : "/dashboard");
      } finally {
        setPendingAction(null);
        setIsLoading(false);
      }
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
      lower.includes("not confirmed") ||
      lower.includes("user not confirmed") ||
      lower.includes("email not verified") ||
      lower.includes("verify your email") ||
      lower.includes("email address not confirmed")
    );
  }, []);

  const isGoogleAccountError = useCallback((msg: string) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes("provider") ||
      lower.includes("identity provider") ||
      lower.includes("oauth") ||
      lower.includes("google") ||
      lower.includes("social") ||
      lower.includes("linked to a social")
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
    // Supabase OAuth full-page callback handling (including recovery links)
    (async () => {
      try {
        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );
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
        const idToken = (hash.get("id_token") || "").trim() || null;
        const refreshToken = (hash.get("refresh_token") || "").trim();
        const type = (hash.get("type") || "").trim();

        // Handle password recovery links (type=recovery)
        if (type === "recovery") {
          setRecoveryMode(true);
          setRecoveryAccessToken(accessToken || null);
          setRecoveryRefreshToken(refreshToken || null);
          try {
            if (supabase && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            }
          } catch {}
          try {
            const cleanUrl = `${window.location.pathname}${window.location.search}`;
            window.history.replaceState({}, document.title, cleanUrl);
          } catch {}
          return;
        }

        // Handle email confirmation links (type=signup)
        if (type === "signup" && accessToken) {
          try {
            setToken(accessToken);
            if (supabase && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            }
            // Clear onboarding state so they start fresh
            try {
              localStorage.removeItem("auth:isNewUser");
              localStorage.removeItem("user:onboarding");
              localStorage.removeItem("user:monthlyGoal");
            } catch {}
            // Clean up URL
            try {
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname,
              );
            } catch {}
            navigate("/onboarding");
          } catch {
            navigate("/onboarding");
          }
          return;
        }

        // If there is no access token, nothing to do here.
        if (!accessToken) return;

        // Immediately switch to signing state so the auth form does not flash
        // after account selection and redirect back.
        setPendingAction({
          kind: "google",
          title: "Signing you in",
          detail: "Syncing your account...",
        });
        setIsLoading(true);

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
    })();
  }, [completeWebGoogleLogin]);

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
            if (!incomingUrl) return;
            if (!incomingUrl.startsWith(GOOGLE_REDIRECT_TO_NATIVE)) return;

            setPendingAction({
              kind: "google",
              title: "Signing you in",
              detail: "Syncing your account...",
            });
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

              if (refreshToken && supabase) {
                void supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
              }

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
          } catch {
            // no-op
          }
        };
      } catch {
        // no-op
      }
    })();

    return () => {
      if (removeListener) removeListener();
    };
  }, [completeWebGoogleLogin, toast]);

  const handleGoogleLogin = async () => {
    const isNative =
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.() === true;

    if (isNative) {
      // Native should never reach here — use Capacitor GoogleAuth instead
      return;
    }

    try {
      setAuthError(null);
      setInvalidCredsOpen(false);

      if (!supabase) {
        toast({
          title: "Google sign-in failed",
          description:
            "Supabase Google auth is not configured. Check environment variables.",
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

    // --- NATIVE FLOW ---
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
        // Mark new user so next sign-in routes to onboarding
        try {
          localStorage.setItem("auth:isNewUser", "1");
        } catch {}
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
      try {
        const isNewUser = localStorage.getItem("auth:isNewUser") === "1";
        if (isNewUser) {
          try {
            localStorage.removeItem("auth:isNewUser");
            localStorage.removeItem("user:onboarding");
            localStorage.removeItem("user:monthlyGoal");
          } catch {}
          // Route new users straight to onboarding without showing the
          // generic "Welcome back" toast.
          navigate("/onboarding");
          return;
        }

        const token = getToken();
        const goOnboarding = token
          ? await shouldRouteToOnboarding(token)
          : false;

        // Only show the welcome toast for returning users routed to the
        // dashboard (not for users being sent to onboarding).
        if (!goOnboarding) {
          toast({ title: "Welcome back", description: "Signed in." });
        }

        navigate(goOnboarding ? "/onboarding" : "/dashboard");
      } catch {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = String(err?.message || err || "Authentication failed");

      if (showSignup) {
        console.log("[Auth] signup error:", msg);
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
        openConfirmEmailDialog(formData.email);
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

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmNewPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (!supabase) throw new Error("Supabase is not configured");
      try {
        if (recoveryRefreshToken) {
          await supabase.auth.setSession({
            access_token: recoveryAccessToken || undefined,
            refresh_token: recoveryRefreshToken,
          });
        }
      } catch {}

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast({
        title: "Password updated",
        description: "You can now log in with your new password.",
      });
      setRecoveryDone(true);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e: any) {
      toast({
        title: "Reset failed",
        description: String(e?.message || e || "Unable to reset password"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activeStep = showSignup ? "signup" : "login";

  return (
    <div
      className={`flex flex-col bg-background overflow-x-hidden ${
        embedded ? "h-full" : "h-screen"
      }`}
    >
      {!embedded && (
        <header
          className="border-b border-border"
          style={{ paddingTop: "var(--safe-area-top)" }}
        >
          <div className="flex h-16 items-center px-4">
            <div
              className="flex items-center gap-2"
              role="presentation"
              aria-hidden="true"
              tabIndex={-1}
            >
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
            </div>
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
            className="w-full rounded-2xl overflow-hidden border border-white/10"
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
                  key={recoveryMode ? "recovery" : activeStep}
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
                      {recoveryMode
                        ? "Set new password"
                        : showSignup
                          ? "Create your account"
                          : "Welcome back"}
                    </CardTitle>
                    <CardDescription>
                      {recoveryMode
                        ? "Enter your new password below."
                        : showSignup
                          ? "Start tracking your workouts and PRs"
                          : "Log in to continue your fitness journey"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    {recoveryMode ? (
                      recoveryDone ? (
                        <div className="space-y-4 text-center">
                          <div className="text-4xl">✅</div>
                          <p className="text-lg font-semibold text-white">
                            Password updated!
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Your password has been changed successfully. You can
                            now close this tab and log in with your new
                            password.
                          </p>
                          <div className="flex justify-center">
                            <Button
                              onClick={() => {
                                try {
                                  window.close();
                                } catch {}
                              }}
                              className="mt-2"
                            >
                              Close this tab
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            If this tab doesn't close, you can close it
                            manually.
                          </p>
                        </div>
                      ) : (
                        <form
                          onSubmit={handleRecoverySubmit}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New password</Label>
                            <div className="relative">
                              <Lock className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                              <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="pl-10 border border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                                required
                                minLength={6}
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmNewPassword">
                              Confirm new password
                            </Label>
                            <div className="relative">
                              <Lock className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white" />
                              <Input
                                id="confirmNewPassword"
                                name="confirmNewPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmNewPassword}
                                onChange={(e) =>
                                  setConfirmNewPassword(e.target.value)
                                }
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
                            {isLoading ? "Updating..." : "Set new password"}
                          </Button>
                        </form>
                      )
                    ) : (
                      <>
                        <div className="mb-4 flex justify-center">
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
                      </>
                    )}
                  </CardContent>
                </motion.div>
              </AnimatePresence>
            )}
          </MotionCard>
        </div>
        <InvalidCredentialsDialog
          open={invalidCredsOpen}
          setOpen={(val) => {
            setInvalidCredsOpen(val);
          }}
          onGoogleSignIn={onClickContinueWithGoogle}
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
