import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Always reset scroll to the top on route changes so each screen/section
// starts at the top (no extra space to scroll up).
export default function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    // Use a frame to ensure layout has settled before scrolling.
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }
    } catch (e) {}
  }, []);

  return null;
}
