import type { EditorialCatalog, EditorialDecisionKind, EditorialVariantId } from "./contracts";

export const EDITORIAL_V1_KINDS = Object.freeze([
  "trip_start_tomorrow",
  "trip_start_today",
  "trip_last_day",
  "weather_attention_candidate",
  "light_moment_candidate",
] as const satisfies readonly EditorialDecisionKind[]);

export const EDITORIAL_V1_VARIANT_IDS = Object.freeze([
  "tomorrow-01",
  "tomorrow-02",
  "today-01",
  "today-02",
  "last-day-01",
  "last-day-02",
  "weather-01",
  "weather-02",
  "light-01",
  "light-02",
] as const satisfies readonly EditorialVariantId[]);

export const EDITORIAL_V1_PLACEHOLDERS = Object.freeze([] as const);

function frozenVariants<const T extends readonly { readonly id: EditorialVariantId; readonly text: string }[]>(
  variants: T,
): T {
  for (const variant of variants) Object.freeze(variant);
  return Object.freeze(variants);
}

const entries = Object.freeze({
  trip_start_tomorrow: frozenVariants([
    { id: "tomorrow-01", text: "Mañana comienza este viaje." },
    { id: "tomorrow-02", text: "Falta poco: el viaje empieza mañana." },
  ]),
  trip_start_today: frozenVariants([
    { id: "today-01", text: "Hoy comienza una nueva historia." },
    { id: "today-02", text: "El viaje empieza hoy, a su propio ritmo." },
  ]),
  trip_last_day: frozenVariants([
    { id: "last-day-01", text: "Hoy es el último día de este viaje." },
    { id: "last-day-02", text: "Este viaje llega hoy a su último día." },
  ]),
  weather_attention_candidate: frozenVariants([
    { id: "weather-01", text: "Quizás sea un buen momento para considerar el clima." },
    { id: "weather-02", text: "El clima puede ser relevante para este momento del viaje." },
  ]),
  light_moment_candidate: frozenVariants([
    { id: "light-01", text: "Puede ser un buen momento para disfrutar la luz natural." },
    { id: "light-02", text: "La luz natural acompaña este momento del viaje." },
  ]),
} satisfies EditorialCatalog["entries"]);

export const EDITORIAL_V1_CATALOG: EditorialCatalog = Object.freeze({
  version: "editorial-v1",
  locale: "es-CL",
  entries,
});
