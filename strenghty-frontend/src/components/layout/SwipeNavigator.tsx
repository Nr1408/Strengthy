import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Define the main top-level sections in the order you want to swipe through
const MAIN_SECTIONS = [
  "/dashboard",
  "/workouts",
  "/exercises",
  "/routines",
  "/profile",
];

const SWIPE_THRESHOLD_PX = 50;

export default function SwipeNavigator() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only enable swipe navigation on small screens (mobile/tablet)
    const isSmallScreen = window.innerWidth <= 1024;
    if (!isSmallScreen) return;

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let tracking = false;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = startX;
      lastY = startY;
      tracking = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      lastX = touch.clientX;
      lastY = touch.clientY;
    };

    const handleTouchEnd = () => {
      if (!tracking) return;
      tracking = false;

      const dx = lastX - startX;
      const dy = lastY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Require mostly-horizontal movement and a minimum distance
      if (absDx < SWIPE_THRESHOLD_PX || absDx < absDy) return;

      const path = location.pathname.split("?")[0];
      const currentIndex = MAIN_SECTIONS.indexOf(path);
      if (currentIndex === -1) return;

      // Interpret horizontal swipe direction:
      // - dx < 0 : finger moved left (right-to-left swipe) -> go to next section
      // - dx > 0 : finger moved right (left-to-right swipe) -> go to previous section
      if (dx < 0) {
        // Right-to-left swipe: advance to the next section (wrap around)
        const nextIndex = (currentIndex + 1) % MAIN_SECTIONS.length;
        navigate(MAIN_SECTIONS[nextIndex]);
      } else if (dx > 0) {
        // Left-to-right swipe: go to previous section (wrap around)
        const prevIndex =
          (currentIndex - 1 + MAIN_SECTIONS.length) % MAIN_SECTIONS.length;
        navigate(MAIN_SECTIONS[prevIndex]);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  return null;
}
