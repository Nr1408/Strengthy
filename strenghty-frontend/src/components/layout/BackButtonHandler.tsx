import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export default function BackButtonHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Only handle native back button on Capacitor native platforms
    if (!Capacitor.isNativePlatform()) return;

    const handler = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        // Go back in React Router history
        navigate(-1);
      } else {
        // If there's nowhere to go back to, exit the app
        App.exitApp();
      }
    });

    return () => {
      handler.remove();
    };
  }, [navigate]);

  return null;
}
