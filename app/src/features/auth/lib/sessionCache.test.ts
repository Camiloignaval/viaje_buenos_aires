import { afterEach, describe, expect, it } from "vitest";
import {
  PERSISTED_SESSION_MAX_AGE_MS,
  readPersistedSession,
  syncPersistedSession,
} from "./sessionCache";
import type { User } from "../types";

const USER: User = {
  id: "u1",
  email: "agus@ejemplo.com",
  displayName: "Agus",
  residenceCountryCode: "CL",
  emailVerifiedAt: "2026-07-11T00:00:00.000Z",
  onboardingCompleted: true,
};

afterEach(() => window.localStorage.clear());

describe("sessionCache", () => {
  it("guarda y recupera la sesión con su timestamp", () => {
    syncPersistedSession({ user: USER }, 1_700_000_000_000);
    expect(readPersistedSession(undefined, 1_700_000_000_000)).toEqual({ user: USER, updatedAt: 1_700_000_000_000 });
  });

  it("limpia el cache cuando la respuesta es válida sin usuario (logout / 401)", () => {
    syncPersistedSession({ user: USER }, 1_700_000_000_000);
    syncPersistedSession({ user: null });
    expect(readPersistedSession()).toBeNull();
  });

  it("devuelve null ante datos corruptos, sin lanzar", () => {
    window.localStorage.setItem("alaia:session:v1", "{ no-json");
    expect(readPersistedSession()).toBeNull();
  });

  it("descarta un registro sin user válido", () => {
    window.localStorage.setItem("alaia:session:v1", JSON.stringify({ user: { id: 1 }, updatedAt: 1 }));
    expect(readPersistedSession()).toBeNull();
  });

  it("descarta un perfil parcial para no ejecutar guards con estado corrupto", () => {
    window.localStorage.setItem(
      "alaia:session:v1",
      JSON.stringify({ user: { id: "u1", email: "agus@ejemplo.com" }, updatedAt: Date.now() }),
    );
    expect(readPersistedSession()).toBeNull();
  });

  it("descarta y elimina un cache vencido", () => {
    const now = 1_700_000_000_000;
    syncPersistedSession({ user: USER }, now - PERSISTED_SESSION_MAX_AGE_MS - 1);

    expect(readPersistedSession(undefined, now)).toBeNull();
    expect(window.localStorage.getItem("alaia:session:v1")).toBeNull();
  });
});
