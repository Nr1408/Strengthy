import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
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
import { getToken, API_BASE, login, register, setToken } from "@/lib/api";
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

export default function Auth() {
  
    if (window.opener && window.location.pathname === "/auth/google/redirect") {
    return null;
  }
  
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AuthFormData>({
    name: "",
    email: "",
    password: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();

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
}, [processGoogleCredential]);

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
    try {      
    } catch (e) {}
    // fetch public config (google client id)
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public-config/`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.google_client_id) {
            setGoogleClientId(String(data.google_client_id));
          }
        }
      } catch (e) {}
    })();
  }, []);

const openGoogleOAuthPopup = () => {
  if (!googleClientId) return;

  const nonce = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: "https://strengthy-backend.onrender.com/api/auth/google/redirect/",
    response_type: "id_token",
    response_mode: "form_post",
    scope: "openid email profile",
    prompt: "select_account",
    nonce,
  });

  const w = 500, h = 600;
  const y = window.top!.outerHeight / 2 + window.top!.screenY - h / 2;
  const x = window.top!.outerWidth / 2 + window.top!.screenX - w / 2;

const popup = window.open(
  `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  "google_oauth",
  `width=${w},height=${h},left=${x},top=${y},noopener=false`
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
      if (!googleClientId) {
        setDialogMessage("Google Client ID still loading. Please try again.");
        setErrorDialogOpen(true);
        return;
      }

      const clientId = googleClientId.trim();

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
            notification.getSkippedReason?.()
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
    setIsLoading(false);
  }
};

  // POST the Google credential to the backend, store token and profile
  const handleGoogleSuccess = async (credential: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the credential under multiple key names to tolerate backend
        // variations (some servers expect `credential`, others `token` or `access_token`).
        body: JSON.stringify({
          credential,
          token: credential,
          access_token: credential,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Google login failed: ${res.status} ${txt}`);
      }
      const data = await res.json();
      if (data.token) {
        try {
          setToken(data.token);
        } catch (e) {}
      }
      try {
        const profile = {
          name: data.name || data.username || null,
          email: data.email || null,
        };
        if (profile.name || profile.email) {
          localStorage.setItem("user:profile", JSON.stringify(profile));
        }
      } catch (e) {}
      return data;
    } catch (e) {
      // rethrow to be handled by caller
      throw e;
    }
  };

  const processGoogleCredential = async (credential: string) => {
  const data = await handleGoogleSuccess(credential);
  toast({ title: "Welcome!", description: "Signed in with Google." });
  const target = data.created ? "/onboarding" : "/dashboard";
  navigate(target);
};

  const onClickContinueWithGoogle = async () => {
    const isNative =
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.() === true;

    // --- WEB FLOW (GIS only) ---
    if (!isNative) {
      await handleGoogleLogin();
      return;
    }

    // --- NATIVE FLOW (Keep existing) ---
    try {
      if (googleClientId) {
        try {
          await GoogleAuth.initialize({
            clientId: googleClientId,
            scopes: ["profile", "email"],
          });
        } catch (e) {}
      }
      const res = await GoogleAuth.signIn();
      const idToken = res?.authentication?.idToken || res?.idToken;

      if (idToken) {
        const r = await fetch(`${API_BASE}/auth/google/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: idToken }),
        });
        if (!r.ok) throw new Error("Native login failed");

        const data = await r.json();
        if (data.token) setToken(data.token);
        toast({ title: "Welcome!", description: "Signed in with Google" });
        navigate("/dashboard");
      }
    } catch (e) {
      console.warn("Native GoogleAuth failed", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          (err as any)?.response?.data || (err as any)?.message || msg
        );
        setDialogMessage(`Full Error: ${deep} | API: ${API_BASE}`);
      } catch (e) {
        setDialogMessage(msg + `\nAPI: ${API_BASE}`);
      }
      setErrorDialogOpen(true);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
              {showSignup ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {showSignup
                ? "Start tracking your workouts and PRs"
                : "Log in to continue your fitness journey"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/** Google sign-in button */}
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={onClickContinueWithGoogle}
                disabled={!googleClientId}
                className="inline-flex items-center rounded-md border border-white/40 px-4 py-2 text-sm text-white hover:bg-white/5"
              >
                <img
                  src="/google-logo.svg"
                  alt="Google"
                  className="mr-2 h-4 w-4"
                />
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
                      className="pl-10 border border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
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
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
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
        </Card>
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
