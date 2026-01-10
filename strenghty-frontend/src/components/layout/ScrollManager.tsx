import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Persist and restore scroll positions per pathname using sessionStorage.
// On navigation we restore previously-saved scroll for that pathname if present.
export default function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const key = `scroll:${location.pathname}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const y = parseInt(saved, 10) || 0;
      // Restore after a tick so layout settled
      window.requestAnimationFrame(() => window.scrollTo({ top: y, left: 0 }));
    }

    // When leaving this route (cleanup before next navigation), save current scroll
    return () => {
      try {
        sessionStorage.setItem(
          key,
          String(window.scrollY || window.pageYOffset || 0)
        );
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Also restore on first mount if a saved position exists for the current pathname
  useEffect(() => {
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch (e) {}
  }, []);

  return null;
}
