import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import { AlaiaOpening } from "@/features/opening/components/AlaiaOpening";
import { AppProviders } from "@/providers/AppProviders";
import { runBrandMigration } from "@/lib/brandMigration";
import { router } from "./router";
import "@/styles/shell.css";

// Banderas consistentes en Chromium/Windows; el font queda local, sin CDN en runtime.
polyfillCountryFlagEmojis("Twemoji Country Flags", "/fonts/TwemojiCountryFlags.woff2");

// Migración de marca Alaia → Alaia de las claves locales, ANTES del primer render
// que las lee. Idempotente y sin pérdida (copy-if-absent, no borra las viejas).
runBrandMigration();

// PWA de Alaia: registra el Service Worker (instalable + offline, autoUpdate).
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
