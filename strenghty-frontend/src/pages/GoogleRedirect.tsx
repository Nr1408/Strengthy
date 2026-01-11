import { useEffect } from "react";

export default function GoogleRedirect() {
    useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const credential = params.get("credential");

    if (!credential) {
        window.opener?.postMessage(
        { type: "google-error", message: "No credential received" },
        window.location.origin
        );
        window.close();
        return;
    }

    // 🔁 Send credential back to main app
    window.opener?.postMessage(
        { type: "google-credential", credential },
        window.location.origin
    );

    // Close popup
    window.close();
    }, []);


  return (
    <div className="h-screen flex items-center justify-center text-white">
      Signing you in…
    </div>
  );
}
