import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import QueryProvider from "../src/providers/Providers.jsx";
import App from "./App.jsx";
import AppToaster from "./components/common/AppToaster.jsx";
import ThemeApplier from "./components/settings/ThemeApplier.jsx";
import { applyTheme } from "./theme";
import "./index.scss";

// Apply default theme before first paint (updated by ThemeApplier on store hydrate)
applyTheme("light", "web");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <ThemeApplier />
        <AppToaster />
        <App />
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>
);