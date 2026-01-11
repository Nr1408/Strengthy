import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, setToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function GoogleRedirect() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const credential = params.get("credential");

    if (!credential) {
      toast({
        title: "Login failed",
        description: "No Google credential received",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/google/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        });

        if (!res.ok) throw new Error("Google authentication failed");

        const data = await res.json();
        setToken(data.token);

        toast({ title: "Welcome!", description: "Signed in with Google" });
        navigate("/dashboard");
      } catch (err) {
        toast({
          title: "Authentication error",
          description: "Google login failed",
          variant: "destructive",
        });
        navigate("/auth");
      }
    })();
  }, []);

  return (
    <div className="h-screen flex items-center justify-center text-white">
      Signing you in…
    </div>
  );
}
