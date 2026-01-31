import React from "react";
import { createRoot } from "react-dom/client";
import { UIFork } from "./components/UIFork";

/**
 * Auto-initializes UIFork by mounting it to the DOM.
 * This should only be called in development mode.
 */
function initUIFork(port: number = 3001) {
  // Only run in development
  // Check Node.js environment
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return;
  }

  // Check for development mode in Vite (import.meta.env.DEV is true in dev)
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV === false) {
    return;
  }

  // Check for production mode in Vite (import.meta.env.MODE)
  if (typeof import.meta !== "undefined" && import.meta.env?.MODE === "production") {
    return;
  }

  // Check if already initialized
  if (document.getElementById("uifork-root")) {
    return;
  }

  // Create root container
  const root = document.createElement("div");
  root.id = "uifork-root";
  document.body.appendChild(root);

  // Mount UIFork component
  const reactRoot = createRoot(root);
  reactRoot.render(React.createElement(UIFork, { port }));
}

// Auto-initialize if this is a direct import (not a library import)
if (typeof window !== "undefined") {
  // Get port from data attribute or default to 3001
  const portAttr = document.documentElement.getAttribute("data-uifork-port");
  const port = portAttr ? parseInt(portAttr, 10) : 3001;

  // Initialize immediately if DOM is ready, otherwise wait
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initUIFork(port));
  } else {
    initUIFork(port);
  }
}

// Export for manual initialization if needed
export { initUIFork };
