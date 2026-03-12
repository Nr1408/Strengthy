import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setToken } from "@/lib/api";

export default function VerificationSuccess() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase appends session to the URL hash after email confirmation:
    // /verified#access_token=xxx&refresh_token=yyy&type=signup
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const type = hash.get("type");

    if (accessToken) {
      setToken(accessToken);
      // Clean up the hash from the URL so tokens aren't visible
      window.history.replaceState(null, "", window.location.pathname);
    }

    setReady(true);

    // Do not auto-redirect after email verification. Let the user continue
    // when they're ready (this avoids forcing the onboarding flow on link
    // opens that may come from email clients or external contexts).
  }, [navigate]);

  const handleContinue = () => {
    navigate("/dashboard");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1115]">
        <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115]">
      <div className="w-full max-w-md bg-[#16191e] rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <CheckCircle2 className="h-16 w-16 text-[#FF6B00]" />
          </div>

          <h1 className="font-heading text-3xl font-extrabold text-[#FF6B00] mb-2">
            Account Verified.
          </h1>

          <p className="text-sm text-zinc-300 mb-6">
            Your email is confirmed. You can close this browser window.
          </p>
        </div>
      </div>
    </div>
  );
}
