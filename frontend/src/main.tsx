import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { initAndroidAppearance } from "./platform/androidShell";
import { App } from "./App";

initAndroidAppearance();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
