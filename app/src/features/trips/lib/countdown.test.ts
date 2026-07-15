import { describe, it, expect } from "vitest";
import {
  tripTemporalState,
  safeTripTemporalState,
  describeTripTemporalState,
  describeTripTemporalCompanion,
} from "./countdown";

const TZ = "America/Argentina/Buenos_Aires";

describe("tripTemporalState", () => {
  it("faltan 8 días (10 de julio → 18 de julio)", () => {
    const now = new Date("2026-07-10T15:00:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    expect(state).toEqual({ kind: "upcoming", days: 8 });
    expect(describeTripTemporalState(state)).toBe("Faltan 8 días.");
  });

  it("sigue mostrando 8 días aunque hoy sean las 23:59 (no trunca por hora del día)", () => {
    const now = new Date("2026-07-10T23:59:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    expect(state).toEqual({ kind: "upcoming", days: 8 });
  });

  it("mañana", () => {
    const now = new Date("2026-07-17T10:00:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    expect(state).toEqual({ kind: "tomorrow" });
    expect(describeTripTemporalState(state)).toBe("Mañana comienza esta historia.");
  });

  it("hoy (día de llegada)", () => {
    const now = new Date("2026-07-18T06:00:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    expect(state).toEqual({ kind: "today" });
    expect(describeTripTemporalState(state)).toBe("Hoy comienza esta historia.");
  });

  it("viaje en curso: día 2 de 4", () => {
    const now = new Date("2026-07-19T10:00:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    expect(state).toEqual({ kind: "in-progress", dayIndex: 2, totalDays: 4, isLastDay: false });
    expect(describeTripTemporalState(state)).toBe("Día 2 de 4.");
  });

  it("último día del viaje: día 4 de 4, marcado como último día", () => {
    const now = new Date("2026-07-21T08:00:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    expect(state).toEqual({ kind: "in-progress", dayIndex: 4, totalDays: 4, isLastDay: true });
    expect(describeTripTemporalCompanion(state)).toBe("Hoy es el último día de esta historia.");
  });

  it("viaje recién terminado: 'Finalizado', nunca dice 'faltan días'", () => {
    const now = new Date("2026-07-25T10:00:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    expect(state).toEqual({ kind: "just-finished", daysSinceEnd: 4 });
    const message = describeTripTemporalState(state);
    expect(message).toBe("El viaje llegó a su final.");
    expect(message.toLowerCase()).not.toContain("faltan");
    expect(describeTripTemporalCompanion(state)).toBe("Este viaje ya forma parte de ustedes.");
  });

  it("viaje del pasado lejano: 'Recuerdo'", () => {
    const now = new Date("2026-08-15T10:00:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    expect(state.kind).toBe("memory");
    expect(describeTripTemporalState(state)).toBe("Ya es un recuerdo de esta historia.");
    expect(describeTripTemporalCompanion(state)).toBe("Ahora esta historia vive en sus recuerdos.");
  });

  it("la frontera Finalizado → Recuerdo respeta la ventana de días", () => {
    const start = "2026-07-18T09:30";
    const end = "2026-07-21T22:00";
    const atWindow = tripTemporalState(new Date("2026-07-28T10:00:00-03:00"), start, end, TZ);
    const pastWindow = tripTemporalState(new Date("2026-07-29T10:00:00-03:00"), start, end, TZ);
    expect(atWindow.kind).toBe("just-finished"); // 7 días después
    expect(pastWindow.kind).toBe("memory"); // 8 días después
  });

  it("calcula 'hoy' en el timezone del DESTINO, no en el del dispositivo", () => {
    // Mismo instante real: en Buenos Aires todavía es 10 de julio a las 23:55,
    // pero en Tokio ya es 11 de julio. El viaje empieza el 18 de julio.
    const now = new Date("2026-07-10T23:55:00-03:00");
    const stateBuenosAires = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    const stateTokyo = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", "Asia/Tokyo");
    expect(stateBuenosAires).toEqual({ kind: "upcoming", days: 8 });
    expect(stateTokyo).toEqual({ kind: "upcoming", days: 7 });
  });

  it("es estable ante transiciones de DST (Santiago, abril 2026)", () => {
    // Chile termina el horario de verano el 2026-04-05 — no debería alterar
    // la cuenta de días de calendario del viaje.
    const now = new Date("2026-04-01T12:00:00-03:00");
    const state = tripTemporalState(now, "2026-04-10T09:00", "2026-04-12T18:00", "America/Santiago");
    expect(state).toEqual({ kind: "upcoming", days: 9 });
  });

  it("describeTripTemporalState mantiene visible el estado factual en todos los baldes", () => {
    expect(describeTripTemporalState({ kind: "upcoming", days: 90 })).toBe("Faltan 90 días.");
    expect(describeTripTemporalState({ kind: "upcoming", days: 45 })).toBe("Faltan 45 días.");
    expect(describeTripTemporalState({ kind: "upcoming", days: 20 })).toBe("Faltan 20 días.");
    expect(describeTripTemporalState({ kind: "upcoming", days: 10 })).toBe("Faltan 10 días.");
    expect(describeTripTemporalState({ kind: "upcoming", days: 3 })).toBe("Faltan 3 días.");
  });

  it("el copy complementario evoluciona sin duplicar el cálculo temporal", () => {
    expect(describeTripTemporalCompanion({ kind: "upcoming", days: 31 })).toBe("La historia ya tiene un destino.");
    expect(describeTripTemporalCompanion({ kind: "upcoming", days: 30 })).toBe(
      "Cada vez falta menos para empezar esta historia.",
    );
    expect(describeTripTemporalCompanion({ kind: "upcoming", days: 8 })).toBe(
      "Cada vez falta menos para empezar esta historia.",
    );
    expect(describeTripTemporalCompanion({ kind: "upcoming", days: 7 })).toBe("Ya casi es hora de entrar.");
    expect(describeTripTemporalCompanion({ kind: "tomorrow" })).toBe("Todo está listo para cuando quieras entrar.");
    expect(describeTripTemporalCompanion({ kind: "today" })).toBe("La historia empieza hoy.");
    expect(describeTripTemporalCompanion({ kind: "in-progress", dayIndex: 2, totalDays: 4, isLastDay: false })).toBe(
      "El viaje ya se está escribiendo.",
    );
    expect(describeTripTemporalCompanion({ kind: "memory", daysSinceEnd: 30 })).toBe(
      "Ahora esta historia vive en sus recuerdos.",
    );
  });

  it("dayIndex/totalDays son siempre números chicos y coherentes con el largo real del viaje, nunca escala de ordinal absoluto", () => {
    const now = new Date("2026-07-19T10:00:00-03:00");
    const state = tripTemporalState(now, "2026-07-18T09:30", "2026-07-21T22:00", TZ);
    if (state.kind !== "in-progress") throw new Error("se esperaba in-progress");
    expect(state.dayIndex).toBe(2);
    expect(state.totalDays).toBe(4);
    // Nunca un ordinal de calendario absoluto filtrado por error (esos rondan
    // las decenas de miles hoy en día) — el día del viaje siempre es chico.
    expect(state.dayIndex).toBeLessThan(1000);
    expect(state.totalDays).toBeLessThan(1000);
    expect(Number.isInteger(state.dayIndex)).toBe(true);
    expect(Number.isInteger(state.totalDays)).toBe(true);
  });

  it("fechas con formato inválido: tripTemporalState tira, nunca devuelve NaN silencioso", () => {
    expect(() => tripTemporalState(new Date(), "no-es-una-fecha", "2026-07-21T22:00", TZ)).toThrow();
    expect(() => tripTemporalState(new Date(), "2026-07-18T09:30", "", TZ)).toThrow();
  });

  it("safeTripTemporalState nunca revienta ante fechas inválidas — devuelve null", () => {
    expect(safeTripTemporalState(new Date(), "no-es-una-fecha", "2026-07-21T22:00", TZ)).toBeNull();
    expect(safeTripTemporalState(new Date(), "2026-07-18T09:30", "", TZ)).toBeNull();
    expect(safeTripTemporalState(new Date(), "2026-07-18T09:30", "también-inválida", TZ)).toBeNull();
  });
});
