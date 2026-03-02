import { useEffect } from "react";

export default function GoogleRedirect() {
  useEffect(() => {
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const idToken = hash.get("id_token");
      const error = hash.get("error_description") || hash.get("error");

      if (error) {
        if (window.opener) {
          window.opener.postMessage(
            { type: "supabase-oauth-error", error },
            window.location.origin,
          );
        }
        setTimeout(() => window.close(), 250);
        return;
      }

      if (!accessToken) return;

      if (window.opener) {
        window.opener.postMessage(
          {
            type: "supabase-oauth-result",
            accessToken,
            idToken,
          },
          window.location.origin,
        );
      }

      try {
        localStorage.setItem(
          "supabase:oauth_result",
          JSON.stringify({ accessToken, idToken }),
        );
      } catch {}

      setTimeout(() => window.close(), 250);
    } catch {
      // no-op
    }
  }, []);

  return (
    <div className="h-screen flex items-center justify-center text-white">
      Signing you in…
    </div>
  );
}
