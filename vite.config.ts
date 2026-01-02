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
      // Workaround for a broken lucide-react ESM entry in this environment.
      // Vite tries to load `dist/esm/lucide-react.js` (missing) via the `module` field.
      "lucide-react": path.resolve(
        __dirname,
        "./node_modules/lucide-react/dist/cjs/lucide-react.js"
      ),
    },
  },
}));
