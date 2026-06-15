import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { initAndroidAppearance } from "./platform/androidShell";
import { initIOSAppearance } from "./platform/iosShell";
import { initNativeAppShell } from "./platform/appShell";
import { App } from "./App";

initNativeAppShell();
initAndroidAppearance();
initIOSAppearance();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
