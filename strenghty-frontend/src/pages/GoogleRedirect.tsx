import { useEffect } from "react";

export default function GoogleRedirect() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const credential = hash.get("credential");

    if (!credential) return;

    // Primary path (Chrome etc)
    if (window.opener) {
      window.opener.postMessage(
        { type: "google-credential", credential },
        window.location.origin
      );
    }

    // Brave fallback: store in localStorage
    try {
      localStorage.setItem("google:credential", credential);
    } catch {}

    // Give main window time to read it
    setTimeout(() => window.close(), 200);
  }, []);

  return (
    <div className="h-screen flex items-center justify-center text-white">
      Signing you in…
    </div>
  );
}
