import { createElement, type ReactNode } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readPersistedSession, SESSION_CACHE_KEY, syncPersistedSession } from "../lib/sessionCache";
import { deriveSessionStatus, sessionQueryKey, shouldRetrySession, useSession } from "./useSession";
import { PlatformApiError } from "@/services/platformClient";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("../api/authApi", () => ({ getSession }));

const USER = {
  id: "u1",
  email: "agus@ejemplo.com",
  displayName: "Agus",
  residenceCountryCode: "CL",
  emailVerifiedAt: "2026-07-11T00:00:00.000Z",
  onboardingCompleted: true,
};

const OTHER_USER = { ...USER, id: "u2", email: "kari@ejemplo.com" };

function renderSession() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, ...renderHook(() => useSession(), { wrapper }) };
}

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("deriveSessionStatus", () => {
  it("con usuario → authenticated", () => {
    expect(deriveSessionStatus({ user: USER }, false, null)).toBe("authenticated");
  });

  it("respuesta válida sin usuario → unauthenticated", () => {
    expect(deriveSessionStatus({ user: null }, false, null)).toBe("unauthenticated");
  });

  it("sin data ni error → checking", () => {
    expect(deriveSessionStatus(undefined, false, null)).toBe("checking");
  });

  it("401 explícito sin data → unauthenticated", () => {
    const error = new PlatformApiError("no", 401, "/api/auth/session");
    expect(deriveSessionStatus(undefined, true, error)).toBe("unauthenticated");
  });

  it("5xx sin data → unavailable (NO unauthenticated)", () => {
    const error = new PlatformApiError("boom", 503, "/api/auth/session");
    expect(deriveSessionStatus(undefined, true, error)).toBe("unavailable");
  });

  it("error de red genérico sin data → unavailable", () => {
    expect(deriveSessionStatus(undefined, true, new Error("network"))).toBe("unavailable");
  });

  it("sesión válida previa + fallo transitorio → conserva authenticated", () => {
    // React Query conserva `data` del último éxito aunque un refetch falle
    // (isError se mantiene en false mientras haya data): la sesión no se pierde.
    expect(deriveSessionStatus({ user: USER }, false, new PlatformApiError("x", 500, "/api/auth/session"))).toBe(
      "authenticated",
    );
  });
});

describe("shouldRetrySession", () => {
  it("no reintenta ante 401/403 (respuestas definitivas)", () => {
    expect(shouldRetrySession(0, new PlatformApiError("no", 401, "/api/auth/session"))).toBe(false);
    expect(shouldRetrySession(0, new PlatformApiError("no", 403, "/api/auth/session"))).toBe(false);
  });

  it("reintenta 5xx hasta 2 veces", () => {
    const error = new PlatformApiError("boom", 500, "/api/auth/session");
    expect(shouldRetrySession(0, error)).toBe(true);
    expect(shouldRetrySession(1, error)).toBe(true);
    expect(shouldRetrySession(2, error)).toBe(false);
  });

  it("reintenta errores de red hasta 2 veces", () => {
    const error = new Error("network");
    expect(shouldRetrySession(0, error)).toBe(true);
    expect(shouldRetrySession(2, error)).toBe(false);
  });
});

describe("useSession persisted cache", () => {
  it("revalida de inmediato un usuario cacheado y reemplaza una identidad anterior", async () => {
    syncPersistedSession({ user: USER });
    getSession.mockResolvedValue({ user: OTHER_USER });

    const { result } = renderSession();

    await waitFor(() => expect(result.current.user).toEqual(OTHER_USER));
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(readPersistedSession()?.user).toEqual(OTHER_USER);
  });

  it("una cookie expirada limpia la semilla persistida sin mostrar una sesión fantasma", async () => {
    syncPersistedSession({ user: USER });
    getSession.mockResolvedValue({ user: null });

    const { result } = renderSession();

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(readPersistedSession()).toBeNull();
  });

  it("un logout en otra pestaña expulsa y descarta los datos privados de esta pestaña", async () => {
    getSession.mockResolvedValue({ user: USER });
    const { client, result } = renderSession();

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    client.setQueryData(["trips", "list"], { trips: [{ id: "trip-1" }] });
    client.setQueryData(["connected", "trip", "trip-1"], { trip: { id: "trip-1" } });
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_CACHE_KEY, newValue: null }));

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(client.getQueryData(["trips", "list"])).toBeUndefined();
    expect(client.getQueryData(["connected", "trip", "trip-1"])).toBeUndefined();
    expect(client.getQueryData(sessionQueryKey)).toEqual({ user: null });
  });
});
