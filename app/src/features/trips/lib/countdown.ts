// Estado temporal de un viaje ("Faltan 8 días", "Hoy comienza esta historia",
// "Día 2 de 4", etc.) — SIEMPRE por diferencia de días de CALENDARIO en el
// timezone del DESTINO, nunca por diferencia de milisegundos entre instantes
// reales. El bug clásico: `Math.floor((tripDate - now) / 86_400_000)` trunca
// según la HORA del día, no según el calendario — a las 23:59 de hoy, un
// viaje "de acá a 8 días" puede reportar 7. Acá "hoy" y la fecha del viaje se
// reducen primero a un ORDINAL de día de calendario (mismo truco que
// duration.ts) y se restan como enteros — la hora nunca entra en la cuenta.
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

function calendarOrdinal(calendarDateLike: string): number {
  const match = CALENDAR_DATE_PATTERN.exec(calendarDateLike);
  if (!match) {
    throw new Error(`Fecha de calendario inválida: ${calendarDateLike}`);
  }
  const [, year, month, day] = match;
  return Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / DAY_IN_MS);
}

// "Hoy" resuelto en el timezone del DESTINO, no en el del dispositivo de
// quien mira la lista — si no, alguien viendo "Mis viajes" desde otro huso
// horario podría ver un día de diferencia respecto al destino real.
function destinationCalendarDate(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Ventana en la que un viaje recién terminado todavía se siente "Finalizado"
// (cierre) antes de volverse "Recuerdo" (memoria lejana).
export const RECENTLY_FINISHED_WINDOW_DAYS = 7;

export type TripTemporalState =
  | { kind: "upcoming"; days: number }
  | { kind: "tomorrow" }
  | { kind: "today" }
  | { kind: "in-progress"; dayIndex: number; totalDays: number; isLastDay: boolean }
  | { kind: "just-finished"; daysSinceEnd: number }
  | { kind: "memory"; daysSinceEnd: number };

export function tripTemporalState(
  now: Date,
  startDateTime: string,
  endDateTime: string,
  timezone: string,
): TripTemporalState {
  const todayOrdinal = calendarOrdinal(destinationCalendarDate(now, timezone));
  const startOrdinal = calendarOrdinal(startDateTime);
  const endOrdinal = calendarOrdinal(endDateTime);

  if (todayOrdinal > endOrdinal) {
    const daysSinceEnd = todayOrdinal - endOrdinal;
    return daysSinceEnd <= RECENTLY_FINISHED_WINDOW_DAYS
      ? { kind: "just-finished", daysSinceEnd }
      : { kind: "memory", daysSinceEnd };
  }
  if (todayOrdinal === startOrdinal) return { kind: "today" };
  if (todayOrdinal > startOrdinal) {
    const totalDays = endOrdinal - startOrdinal + 1;
    const dayIndex = todayOrdinal - startOrdinal + 1;
    return { kind: "in-progress", dayIndex, totalDays, isLastDay: dayIndex === totalDays };
  }

  const days = startOrdinal - todayOrdinal;
  if (days === 1) return { kind: "tomorrow" };
  return { kind: "upcoming", days };
}

/**
 * Variante defensiva para datos persistidos que no controlamos del todo
 * (legacy, migraciones a medio hacer, corrupción manual en Mongo): si
 * cualquiera de las fechas no matchea el formato esperado, devuelve `null`
 * en vez de tirar — el consumidor simplemente no muestra countdown, nunca
 * revienta el render ni deja pasar un NaN/"Invalid Date".
 */
export function safeTripTemporalState(
  now: Date,
  startDateTime: string,
  endDateTime: string,
  timezone: string,
): TripTemporalState | null {
  try {
    return tripTemporalState(now, startDateTime, endDateTime, timezone);
  } catch {
    return null;
  }
}

/** Mensaje editorial para cada estado — nunca un número técnico suelto. */
export function describeTripTemporalState(state: TripTemporalState): string {
  switch (state.kind) {
    case "memory":
      return "Una historia que sigue cerca.";
    case "just-finished":
      return "Hace poco, esta historia volvía con ustedes.";
    case "today":
      return "Hoy comienza esta historia.";
    case "tomorrow":
      return "Mañana empieza esta historia.";
    case "in-progress":
      return state.isLastDay
        ? "Todavía queda historia en este último día."
        : "La historia se está escribiendo.";
    case "upcoming":
      return "La historia todavía está por comenzar.";
  }
}

/** Segunda línea emocional; el estado factual de arriba sigue siendo la fuente única. */
export function describeTripTemporalCompanion(state: TripTemporalState): string {
  switch (state.kind) {
    case "memory":
      return "Algunas historias acompañan mucho después.";
    case "just-finished":
      return "Lo vivido va encontrando su lugar, sin apuro.";
    case "today":
      return "La historia empieza hoy.";
    case "tomorrow":
      return "Todo está listo para cuando quieras entrar.";
    case "in-progress":
      return state.isLastDay
        ? "Todavía queda un día para guardar."
        : "El viaje está ocurriendo ahora.";
    case "upcoming":
      return state.days > 30
        ? "La historia ya tiene un lugar en el horizonte."
        : "Todo estará listo cuando llegue el momento.";
  }
}
