import { useEffect } from "react";

export default function GoogleRedirect() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const credential = hash.get("credential");

    if (!credential || !window.opener) return;

    window.opener.postMessage(
      { type: "google-credential", credential },
      window.location.origin
    );

    window.close();
  }, []);

  return <div className="h-screen flex items-center justify-center text-white">
    Signing you in…
  </div>;
}
