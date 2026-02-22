import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { UIFork } from "uifork";

const showUIFork = import.meta.env.MODE !== "production";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {showUIFork && <UIFork />}
    <App />
  </StrictMode>,
);
