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
      uifork: resolve(__dirname, "../src"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
