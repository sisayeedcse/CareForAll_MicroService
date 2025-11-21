import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config with base set for serving under /campaign/
export default defineConfig({
  base: "/campaign/",
  plugins: [react()],
});
