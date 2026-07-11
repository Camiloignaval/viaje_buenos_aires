import { resolve } from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react";

// Normalizado a "/" — en Windows resolve() devuelve backslashes y la resolución
// de imports de Vite espera separadores POSIX.
const srcDir = resolve(__dirname, "src").replace(/\\/g, "/");

// Aurora es una SPA React única (index.html). `admin.html` es Aurora Studio, una
// herramienta aparte que NO es la app instalable: este plugin le quita el
// <link rel="manifest"> que vite-plugin-pwa inyecta en cada HTML del build, para
// que solo index.html se anuncie/instale como Aurora.
function stripManifestFromStudio() {
  return {
    name: "strip-manifest-from-studio",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (ctx.filename?.endsWith("admin.html")) {
          return html.replace(/<link rel="manifest"[^>]*>\n?/, "");
        }
        return html;
      },
    },
  };
}

// En dev, `npm run dev` solo sirve el frontend. Las funciones serverless en
// `api/` necesitan `vercel dev`. Sin esto, Vite devolvería el código fuente de
// esos archivos como texto para /api/*, y con el fallback SPA cualquier /api/*
// sin match caería en index.html (HTML donde el cliente espera JSON).
function blockApiRoutes(req, res, next) {
  if (req.url?.startsWith("/api/")) {
    res.statusCode = 404;
    res.end();
    return;
  }
  next();
}

export default defineConfig({
  // Alias @/* → src/*, espejo de tsconfig paths. Forma regex con $1: la forma
  // string bare "@" no matchea de forma fiable en Vite 8/Rolldown.
  resolve: {
    alias: [{ find: /^@\/(.*)$/, replacement: `${srcDir}/$1` }],
  },
  build: {
    rollupOptions: {
      input: {
        // Aurora: la SPA React única.
        main: resolve(__dirname, "index.html"),
        // Aurora Studio (herramienta de publicación, entrada aparte).
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
  plugins: [
    react({ include: /\.(jsx|tsx)$/ }),
    {
      name: "block-api-in-dev",
      configureServer(server) {
        server.middlewares.use(blockApiRoutes);
      },
      configurePreviewServer(server) {
        server.middlewares.use(blockApiRoutes);
      },
    },
    // PWA de Aurora. El Service Worker se registra desde la SPA React
    // (src/app/main.tsx, virtual:pwa-register) — nunca desde Studio.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // registro manual desde React (main.tsx)
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,mp4,webmanifest,ico}"],
        globIgnores: [
          // Studio no es la app instalable.
          "admin.html",
          // Export bruto de íconos: duplica assets ya curados bajo /icons.
          "AppAssets_2026-07-09/**/*",
          // Copias legacy en la raíz: la historia carga estas fotos desde
          // /images/*. Fuera del precache para no inflar la primera instalación.
          "dia1-cena.jpg",
          "dia1-corrientes.jpg",
          "dia1-cuartito.jpg",
          "dia1-rapanui.jpg",
          "dia2-almuerzo.jpg",
          "dia2-cafepalermo.jpg",
          "dia2-cementerio.jpg",
          "dia2-cena.jpg",
          "dia2-floralis.jpg",
          "dia2-puertomadero.jpg",
          "dia2-rosedal.jpg",
          "dia3-almuerzo.jpg",
          "dia3-caminito.jpg",
          "dia3-dorrego.jpg",
          "dia3-floreria.jpg",
          "dia3-mafalda.jpg",
          "dia3-mercado.jpg",
          "dia4-almuerzo.jpg",
          "dia4-ateneo.jpg",
          "hotel.jpg",
        ],
        navigateFallback: "/index.html",
        // Assets emocionales (cover-hero.jpg, video_intro_2.mp4) superan el
        // límite por defecto de Workbox (2 MiB); sin esto el offline completo
        // dejaría afuera la primera impresión.
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      },
      includeAssets: [
        "icons/Web/favicon.ico",
        "icons/Web/favicon-16x16.png",
        "icons/Web/favicon-32x32.png",
        "icons/Web/apple-touch-icon.png",
        "icons/Web/android-chrome-192x192.png",
        "icons/Web/android-chrome-512x512.png",
        "icons/Web/icon-maskable-192x192.png",
        "icons/Web/icon-maskable-512x512.png",
        "icons/Web/og.png",
      ],
      manifest: {
        id: "/",
        name: "Aurora — Buenos Aires 2026",
        short_name: "Aurora",
        description: "Un compañero de viaje para vivir y recordar Buenos Aires 2026.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0f0e0d",
        theme_color: "#0f0e0d",
        lang: "es",
        icons: [
          { src: "/icons/Web/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable any" },
          { src: "/icons/Web/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable any" },
          { src: "/icons/Web/icon-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable any" },
          { src: "/icons/Web/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable any" },
        ],
      },
    }),
    stripManifestFromStudio(),
  ],
});
