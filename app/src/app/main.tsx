import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { AlaiaOpening } from "@/features/opening/components/AlaiaOpening";
import { AppProviders } from "@/providers/AppProviders";
import { router } from "./router";
import "@/styles/shell.css";

// PWA de Aurora: registra el Service Worker (instalable + offline, autoUpdate).
registerSW({ immediate: true });

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("No se encontró el elemento raíz #root");

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders>
      <AlaiaOpening>
        <RouterProvider router={router} />
      </AlaiaOpening>
    </AppProviders>
  </StrictMode>,
);
