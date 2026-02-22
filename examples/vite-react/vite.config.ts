import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When UIFORK_LOCAL=true, point directly to source for HMR during active development
const useLocalSource = process.env.UIFORK_LOCAL === "true";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // When developing the uifork package, alias to source for HMR
      ...(useLocalSource && {
        uifork: path.resolve(__dirname, "../../packages/uifork/src"),
      }),
    },
  },
  server: {
    watch: {
      // Watch the uifork source directory for changes when using local source
      ignored: useLocalSource
        ? ["!**/node_modules/**", "!**/packages/uifork/src/**"]
        : undefined,
    },
  },
});
