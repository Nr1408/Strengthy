import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
  host: "::",
  port: 5173,
  headers: {
    "Content-Security-Policy": ""
  }
},
  build: {
    outDir: "dist",
    // use relative paths so assets load correctly inside a native WebView
    base: "./",
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  optimizeDeps: {
    include: [
      "@codetrix-studio/capacitor-google-auth",
      "@capacitor/preferences",
      "@capacitor/core",
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // When building in a workspace (Vercel/npm workspaces) react may be
      // hoisted to the repository root node_modules. Provide explicit
      // aliases so Rollup/Vite can resolve the hoisted packages during CI.
    },
  },
}));
