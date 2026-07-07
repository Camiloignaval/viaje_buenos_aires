// Capa de datos de la app.
//
// Modo híbrido: al cargar, la app prueba si /api/memories responde.
//  - Si responde (backend desplegado en Vercel con las variables configuradas):
//    todo se lee/escribe contra la API → MongoDB + Cloudinary.
//  - Si no responde (estás con `npm run dev`, o el backend todavía no existe):
//    todo se lee/escribe en localStorage, igual que en la Fase 1.
//
// main.js no sabe ni le importa cuál de los dos modos está activo — siempre
// llama a las mismas funciones (getMemories, upsertMemory, uploadImage...).
//
// Forma de un "Memory":
// { id, title, day, category, completed, note, imageUrl, cloudinaryPublicId, createdAt, updatedAt }

import { IMAGE_LIMITS } from "./data.js";
import { compressImage } from "./image.js";

const STORAGE_KEY = "ba-trip-memories";

let backendAvailable = null; // null = todavía no se probó

async function checkBackend() {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const res = await fetch("/api/memories", { method: "GET" });
    backendAvailable = res.ok;
  } catch {
    backendAvailable = false;
  }
  if (!backendAvailable) {
    console.info("[ba-trip] Backend no disponible — usando localStorage (modo local).");
  } else {
    console.info("[ba-trip] Backend detectado — usando MongoDB + Cloudinary.");
  }
  return backendAvailable;
}

/** Solo para mostrar un indicador en el header ("modo local" vs conectado) */
export async function isUsingBackend() {
  return checkBackend();
}

// ---------- localStorage (modo local) ----------

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function localUpsert(id, patch) {
  const all = loadAll();
  const now = new Date().toISOString();
  const existing = all[id] || {
    id,
    title: patch.title || "",
    day: patch.day ?? null,
    category: patch.category || "",
    completed: false,
    note: "",
    imageUrl: null,
    cloudinaryPublicId: null,
    createdAt: now,
  };
  all[id] = { ...existing, ...patch, id, updatedAt: now };
  saveAll(all);
  return all[id];
}

// ---------- API pública (usada por main.js) ----------

/** Devuelve todos los recuerdos guardados, como { [id]: Memory } */
export async function getMemories() {
  if (await checkBackend()) {
    const res = await fetch("/api/memories");
    if (!res.ok) throw new Error("No se pudieron cargar los recuerdos del servidor.");
    return res.json();
  }
  return loadAll();
}

/**
 * Crea o actualiza (parcialmente) un recuerdo.
 * patch puede incluir: title, day, category, completed, note, imageUrl, cloudinaryPublicId
 */
export async function upsertMemory(id, patch) {
  if (await checkBackend()) {
    const res = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("No se pudo guardar el cambio en el servidor.");
    return res.json();
  }
  return localUpsert(id, patch);
}

/** Elimina un recuerdo por completo (no solo la foto) */
export async function deleteMemory(id) {
  if (await checkBackend()) {
    const res = await fetch(`/api/memories/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("No se pudo borrar en el servidor.");
    return;
  }
  const all = loadAll();
  delete all[id];
  saveAll(all);
}

/**
 * Valida, comprime y sube una imagen.
 * - Modo local: la comprime y la guarda como data URL directamente en localStorage
 *   (no hay nada que proteger, así que `password` se ignora).
 * - Modo backend: la comprime y la manda a POST /api/upload junto con la
 *   contraseña, que el servidor valida contra UPLOAD_PASSWORD antes de subir a Cloudinary.
 *
 * Si el servidor responde 401, se lanza un error con `unauthorized: true` para
 * que la UI pueda pedir la contraseña de nuevo.
 */
export async function uploadImage(file, password) {
  if (!IMAGE_LIMITS.acceptedTypes.includes(file.type)) {
    throw new Error("Formato no permitido. Usar JPG, PNG o WEBP.");
  }
  const maxBytes = IMAGE_LIMITS.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`La imagen pesa más de ${IMAGE_LIMITS.maxSizeMB}MB.`);
  }

  const compressedDataUrl = await compressImage(file);

  if (await checkBackend()) {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: compressedDataUrl, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.error || "No se pudo subir la imagen.");
      if (res.status === 401) err.unauthorized = true;
      throw err;
    }
    return res.json(); // { imageUrl, cloudinaryPublicId }
  }

  return { imageUrl: compressedDataUrl, cloudinaryPublicId: null };
}

/** Progreso global: cuántos ítems del viaje ya están completados */
export async function getProgress(allItemIds) {
  const all = await getMemories();
  const total = allItemIds.length;
  const done = allItemIds.filter((id) => all[id]?.completed).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
