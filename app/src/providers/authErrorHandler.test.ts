import { describe, it, expect, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { handleAuthError } from "./authErrorHandler";
import { PlatformApiError } from "@/services/platformClient";
import { sessionQueryKey } from "@/features/auth/hooks/useSession";

function seededClient() {
  const client = new QueryClient();
  client.setQueryData(sessionQueryKey, { user: { id: "u1", email: "a@b.com" } });
  client.setQueryData(["trips", "list"], { trips: [{ id: "t1" }] });
  client.setQueryData(["connected", "trip", "t1"], { ok: true });
  return client;
}

describe("handleAuthError", () => {
  let client: QueryClient;
  beforeEach(() => {
    client = seededClient();
  });

  it("401 de un endpoint de datos → marca unauthenticated y suelta datos privados", () => {
    handleAuthError(client, new PlatformApiError("no auth", 401, "/api/trips"));
    expect(client.getQueryData(sessionQueryKey)).toEqual({ user: null });
    expect(client.getQueryData(["trips", "list"])).toBeUndefined();
    expect(client.getQueryData(["connected", "trip", "t1"])).toBeUndefined();
  });

  it("403 NO se trata como 401: la sesión queda intacta", () => {
    handleAuthError(client, new PlatformApiError("sin permiso", 403, "/api/trips/t1"));
    expect(client.getQueryData(sessionQueryKey)).toEqual({ user: { id: "u1", email: "a@b.com" } });
    expect(client.getQueryData(["trips", "list"])).toBeDefined();
  });

  it("401 de /api/auth/* (p. ej. código incorrecto) NO desloguea la sesión global", () => {
    handleAuthError(client, new PlatformApiError("código malo", 401, "/api/auth/verify-code"));
    expect(client.getQueryData(sessionQueryKey)).toEqual({ user: { id: "u1", email: "a@b.com" } });
  });

  it("errores que no son PlatformApiError se ignoran", () => {
    handleAuthError(client, new Error("network"));
    expect(client.getQueryData(sessionQueryKey)).toEqual({ user: { id: "u1", email: "a@b.com" } });
  });
});
