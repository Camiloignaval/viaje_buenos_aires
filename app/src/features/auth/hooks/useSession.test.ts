import { describe, it, expect } from "vitest";
import { deriveSessionStatus, shouldRetrySession } from "./useSession";
import { PlatformApiError } from "@/services/platformClient";

const USER = {
  id: "u1",
  email: "agus@ejemplo.com",
  displayName: "Agus",
  residenceCountryCode: "CL",
  emailVerifiedAt: "2026-07-11T00:00:00.000Z",
  onboardingCompleted: true,
};

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
