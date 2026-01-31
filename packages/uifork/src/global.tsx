/**
 * Global entry point for UIFork that can be loaded via script tag.
 * This file is built as a standalone bundle that includes React and ReactDOM.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { UIFork } from "./components/UIFork";

// Declare global type for window.uifork
declare global {
  interface Window {
    uifork?: {
      init: (port?: number) => void;
    };
  }
}

/**
 * Initialize UIFork and mount it to the DOM.
 * Can be called manually via window.uifork.init() or auto-initializes.
 */
function initUIFork(port: number = 3001) {
  // Only run in development
  // Check for production mode via various methods
  const isProduction =
    (typeof process !== "undefined" && process.env?.NODE_ENV === "production") ||
    (typeof import.meta !== "undefined" && import.meta.env?.DEV === false) ||
    (typeof import.meta !== "undefined" && import.meta.env?.MODE === "production") ||
    (typeof window !== "undefined" &&
      window.location?.hostname !== "localhost" &&
      !window.location?.hostname?.startsWith("127.0.0.1") &&
      !window.location?.hostname?.startsWith("192.168.") &&
      window.location?.protocol !== "file:");

  // Allow override via data attribute
  const forceEnable = document.documentElement.getAttribute("data-uifork-enable") === "true";

  if (isProduction && !forceEnable) {
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

// Expose to window for manual initialization
if (typeof window !== "undefined") {
  window.uifork = {
    init: initUIFork,
  };
}

// Auto-initialize if DOM is ready
if (typeof window !== "undefined") {
  const portAttr = document.documentElement.getAttribute("data-uifork-port");
  const port = portAttr ? parseInt(portAttr, 10) : 3001;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initUIFork(port));
  } else {
    initUIFork(port);
  }
}
