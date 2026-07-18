/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<unknown> };

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Fallback SPA: cualquier navegación offline resuelve a /index.html para que
// React Router tome el control de la ruta (equivale al navigateFallback de
// generateSW, pero explícito porque usamos injectManifest).
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

// Media editorial visitada: cache-first acotado. Evita convertir los más de
// 100 MiB de public/ en requisito de instalación y conserva imágenes ya vistas
// durante conectividad débil. Los videos quedan fuera: los requests Range
// requieren una política propia y no deben llenar la cuota móvil a escondidas.
const STORY_IMAGE_CACHE = "alaia-story-images-v1";
const MAX_STORY_IMAGES = 80;

async function cacheStoryImage(request: Request): Promise<Response> {
  const cache = await caches.open(STORY_IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.status === 200) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STORY_IMAGES)).map((key) => cache.delete(key)));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method === "GET"
    && event.request.destination === "image"
    && url.origin === self.location.origin
    && url.pathname.startsWith("/content/stories/")
  ) {
    event.respondWith(cacheStoryImage(event.request));
  }
});

const SAFE_PATH = /^\/trips(?:\/[^/?#]+)?$/;
const FALLBACK_PATH = "/trips";

function readPayload(event: PushEvent): { title: string; body: string; path: string } | null {
  try {
    const data = event.data?.json() as { title?: unknown; body?: unknown; path?: unknown } | undefined;
    const title = typeof data?.title === "string" ? data.title.slice(0, 120) : "";
    const body = typeof data?.body === "string" ? data.body.slice(0, 240) : "";
    const path = typeof data?.path === "string" && SAFE_PATH.test(data.path) ? data.path : FALLBACK_PATH;
    return title && body ? { title, body, path } : null;
  } catch { return null; }
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event);
  if (!payload) return;
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, data: { path: payload.path }, tag: "alaia-companion" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = typeof event.notification.data?.path === "string" && SAFE_PATH.test(event.notification.data.path) ? event.notification.data.path : FALLBACK_PATH;
  const url = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); return existing.focus(); }
    return self.clients.openWindow(url);
  })());
});
