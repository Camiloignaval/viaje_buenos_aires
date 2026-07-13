import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const srcDir = fileURLToPath(new URL("./src", import.meta.url)).replace(
  /\\/g,
  "/",
);
const setupFile = fileURLToPath(new URL("./src/app/test/setup.ts", import.meta.url));

// Config dedicada de Vitest para el frontend React (.tsx/.ts).
// Los tests legacy de node (`node --test`, en *.test.js) siguen corriendo por
// separado vía `npm test` — no se tocan hasta migrar su feature.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@\/(.*)$/, replacement: `${srcDir}/$1` }],
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Vitest 4 + Vite 8 no resuelven de forma fiable este path relativo en
    // Windows: terminaba convertido a un módulo `/@fs/...` inexistente. Un
    // path de sistema explícito mantiene el setup único de RTL para toda suite.
    setupFiles: [setupFile],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
