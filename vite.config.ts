import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // lucide-react v0.462.0 in this environment ships a broken ESM entry (module points to a missing file).
      // Force the working CJS bundle to avoid "Failed to resolve entry for package \"lucide-react\"".
      "lucide-react": path.resolve(__dirname, "./node_modules/lucide-react/dist/cjs/lucide-react.js"),
    },
  },
}));
