import { defineConfig } from "@playwright/test";

// Harness de screenshots de la experiencia de ACCESO, atado a la galería de
// estados dev-only (/dev/states?state=…). No depende de API/Mongo/login real.
// Levanta Vite en un puerto fijo para ser reproducible.
const PORT = 4188;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  // Un "project" por viewport: mobile chico, mobile grande, tablet y desktop.
  projects: [
    { name: "mobile-small", use: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 } },
    { name: "mobile-large", use: { viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 } },
    { name: "tablet", use: { viewport: { width: 820, height: 1180 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
