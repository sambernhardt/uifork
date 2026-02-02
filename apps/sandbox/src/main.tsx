import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";
import { UIFork } from "uifork";
import { makeAnimationDelay } from "./lib/utils";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <UIFork className="fade-up" style={{ animationDelay: makeAnimationDelay(1) }} />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
