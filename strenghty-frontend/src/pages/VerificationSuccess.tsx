import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerificationSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115]">
      <div className="w-full max-w-md bg-[#16191e] rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <CheckCircle2 className="h-16 w-16 text-[#FF6B00]" />
          </div>

          <h1 className="font-heading text-3xl font-extrabold text-[#FF6B00] mb-2">
            ACCOUNT VERIFIED.
          </h1>

          <p className="text-sm text-zinc-300 mb-6">
            Your email is confirmed. You can now close this tab and return to
            the app to start tracking your gains.
          </p>

          <div className="w-full flex justify-center">
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-[#FF6B00] hover:brightness-95 text-black px-6 py-2 rounded-md"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
