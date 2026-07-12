import { defineConfig } from "@playwright/test";

// Harness de screenshots de la experiencia de ACCESO, atado a la galería de
// estados dev-only (/dev/states?state=…). No depende de API/Mongo/login real.
// Levanta Vite en un puerto fijo para ser reproducible.
const PORT = 4188;
const HOST = "127.0.0.1";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://${HOST}:${PORT}`,
  },
  // Un "project" por viewport: mobile chico, mobile grande, tablet y desktop.
  projects: [
    { name: "mobile-small", use: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 } },
    { name: "mobile-medium", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
    { name: "mobile-large", use: { viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 } },
    { name: "tablet", use: { viewport: { width: 820, height: 1180 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
