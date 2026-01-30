import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Alias the package to the source directory for direct imports
      // This allows HMR to work with changes in the uifork package
      uifork: resolve(__dirname, "../../packages/uifork/src"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      // Watch the uifork source directory for changes
      ignored: ["!**/node_modules/**", "!**/packages/uifork/src/**"],
    },
  },
});
