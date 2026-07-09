import { resolve } from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// vite-plugin-pwa inyecta el <link rel="manifest"> en TODOS los HTML que Vite
// build-ee, sin distinguir cuál es la app instalable — con build multi-página
// eso incluiría a `index.html` (el prototipo viejo) y a `admin.html` (Aurora
// Studio, Épica 5 — una herramienta, no la app). Este plugin corre después y
// lo saca de esos dos: solo `experience.html` anuncia el manifest de Aurora.
function stripManifestFromLegacyHtml() {
  return {
    name: "strip-manifest-from-legacy-html",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (ctx.filename?.endsWith("index.html") || ctx.filename?.endsWith("admin.html")) {
          return html.replace(/<link rel="manifest"[^>]*>\n?/, "");
        }
        return html;
      },
    },
  };
}

// En dev, `npm run dev` solo sirve el frontend (ver README). Las funciones
// serverless en `api/` necesitan `vercel dev` para ejecutarse de verdad.
// Sin esto, Vite devuelve el código fuente de esos archivos como texto plano
// para peticiones a /api/*, y storage.js lo interpreta como backend
// disponible, rompiendo el fallback a localStorage. `vite preview` (necesario
// para probar la PWA con un build real, Épica 4) tenía el mismo problema por
// una razón distinta: sin esto, cualquier ruta sin archivo estático — incluida
// `/api/memories` — cae al fallback de `index.html`, devolviendo HTML donde
// `storage.js` espera JSON. Se descubrió validando la Épica 4, no la causó.
function blockApiRoutes(req, res, next) {
  if (req.url?.startsWith("/api/")) {
    res.statusCode = 404;
    res.end();
    return;
  }
  next();
}

export default defineConfig({
  build: {
    // Por defecto Vite solo build-ea index.html (el prototipo viejo). Aurora
    // (experience.html) necesita estar en el build real para poder instalarse
    // como PWA — Épica 4. `admin.html` (Aurora Studio, Épica 5) también, porque
    // es una herramienta real que se usa en producción (publicar historias),
    // a diferencia de `debug.html`/`memories.html` que quedan afuera a propósito.
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        experience: resolve(__dirname, "experience.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
  plugins: [
    {
      name: "block-api-in-dev",
      configureServer(server) {
        server.middlewares.use(blockApiRoutes);
      },
      configurePreviewServer(server) {
        server.middlewares.use(blockApiRoutes);
      },
    },
    // Épica 4 — PWA solo para Aurora (experience.html). El Service Worker se
    // registra ÚNICAMENTE desde experienceView.js (nunca desde main.js, debug.html
    // ni memories.html) — así el prototipo viejo con backend (`../lib`, `../api`,
    // detección de backend por fetch) nunca queda bajo su control. `globIgnores`
    // excluye además los 3 HTML que no son Aurora, por si algún chunk suelto
    // quedara precacheado (inofensivo, pero así ninguno de esos 3 se sirve
    // jamás desde cache ni se "instala" como si fuera la app real).
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // registro manual, solo desde experienceView.js
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,mp4,webmanifest,ico}"],
        globIgnores: ["index.html", "debug.html", "memories.html", "admin.html"],
        navigateFallback: null,
        // Los assets emocionales de Aurora (cover-hero.jpg y video_intro_2.mp4)
        // pesan más que el límite por defecto de Workbox (2 MiB). Sin esto,
        // "offline completo" dejaría afuera justo la primera impresión.
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      },
      includeAssets: [
        "icons/Web/favicon.ico",
        "icons/Web/favicon-16x16.png",
        "icons/Web/favicon-32x32.png",
        "icons/Web/apple-touch-icon.png",
        "icons/Web/android-chrome-192x192.png",
        "icons/Web/android-chrome-512x512.png",
        "icons/Web/og.png",
      ],
      manifest: {
        id: "/experience.html",
        name: "Aurora — Buenos Aires 2026",
        short_name: "Aurora",
        description: "Un compañero de viaje para vivir y recordar Buenos Aires 2026.",
        start_url: "/experience.html",
        scope: "/",
        display: "standalone",
        background_color: "#16110e",
        theme_color: "#16110e",
        lang: "es",
        icons: [
          { src: "/icons/Web/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/Web/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      },
    }),
    stripManifestFromLegacyHtml(),
  ],
});
