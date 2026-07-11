import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const srcDir = fileURLToPath(new URL("./src", import.meta.url)).replace(
  /\\/g,
  "/",
);

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
    setupFiles: ["./src/app/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
