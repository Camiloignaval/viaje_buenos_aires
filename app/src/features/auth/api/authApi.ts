import { platformRequest } from "@/services/platformClient";
import type { User } from "../types";

// Login passwordless en dos pasos (código de 6 dígitos por email). La cookie de
// sesión la setea el server; acá no se maneja ningún token.

/** Paso 1: pide un código de acceso. El código llega por email (fuera de banda). */
export function requestCode(email: string) {
  return platformRequest<{ ok: true }>("/api/auth/request-code", {
    method: "POST",
    body: { email },
  });
}

/** Paso 2: canjea email+código por una sesión (cookie HttpOnly). */
export function verifyCode(email: string, code: string) {
  return platformRequest<{ user: User; expiresAt: string }>(
    "/api/auth/verify-code",
    { method: "POST", body: { email, code } },
  );
}

/** Sesión actual según la cookie. `{ user: null }` si no hay sesión válida. */
export function getSession() {
  return platformRequest<{ user: User | null }>("/api/auth/session");
}

/** Cierra la sesión (el server borra la cookie). */
export function logout() {
  return platformRequest<{ ok: true }>("/api/auth/logout", { method: "POST" });
}
