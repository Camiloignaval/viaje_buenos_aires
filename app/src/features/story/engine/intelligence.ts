// Story Intelligence Metadata: describe el SIGNIFICADO de un momento o lugar,
// no solo su contenido. No es visible para el usuario; alimenta usos futuros
// (contexto, recordatorios, resúmenes, narrativa e IA de la Etapa 7).
//
// Reglas: toda metadata es OPCIONAL (nunca rompe historias existentes) y debe
// tener un uso futuro claro (nada decorativo). Vive en el Story Package, nunca
// en componentes React. Los sets de valores permitidos se exportan para que el
// Health Check valide sin duplicar la lista.

export const ENERGY_LEVELS = ["low", "medium", "high"] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export const WALKING_DIFFICULTIES = ["easy", "moderate", "demanding"] as const;
export type WalkingDifficulty = (typeof WALKING_DIFFICULTIES)[number];

export const CROWD_LEVELS = ["quiet", "moderate", "busy"] as const;
export type CrowdLevel = (typeof CROWD_LEVELS)[number];

export const BUDGET_LEVELS = ["budget", "moderate", "premium"] as const;
export type BudgetLevel = (typeof BUDGET_LEVELS)[number];

/** Escala de intensidad para dimensiones cualitativas (romántico, cultural…). */
export const INTENSITY_LEVELS = ["none", "low", "medium", "high"] as const;
export type IntensityLevel = (typeof INTENSITY_LEVELS)[number];

export interface StoryIntelligence {
  /** Emoción predominante del momento (texto curado, ej. "asombro"). */
  emotion?: string;
  energyLevel?: EnergyLevel;
  walkingDifficulty?: WalkingDifficulty;
  familyFriendly?: boolean;
  rainFriendly?: boolean;
  photoMoment?: boolean;
  /** Mejor momento del día en texto curado (ej. "atardecer"). */
  bestMoment?: string;
  reservationRecommended?: boolean;
  cashPreferred?: boolean;
  /** Duración estimada en texto libre (ej. "45–60 min"). */
  durationEstimate?: string;
  crowdLevel?: CrowdLevel;
  indoor?: boolean;
  outdoor?: boolean;
  budgetLevel?: BudgetLevel;
  /** Tipo de comida (para lugares gastronómicos), texto curado. */
  foodType?: string;
  romanticLevel?: IntensityLevel;
  culturalLevel?: IntensityLevel;
  historicalLevel?: IntensityLevel;
  relaxLevel?: IntensityLevel;
}

/** Campos enum: nombre → set de valores permitidos, para validación. */
export const INTELLIGENCE_ENUM_FIELDS = {
  energyLevel: ENERGY_LEVELS,
  walkingDifficulty: WALKING_DIFFICULTIES,
  crowdLevel: CROWD_LEVELS,
  budgetLevel: BUDGET_LEVELS,
  romanticLevel: INTENSITY_LEVELS,
  culturalLevel: INTENSITY_LEVELS,
  historicalLevel: INTENSITY_LEVELS,
  relaxLevel: INTENSITY_LEVELS,
} as const satisfies Record<string, readonly string[]>;

export const INTELLIGENCE_BOOLEAN_FIELDS = [
  "familyFriendly",
  "rainFriendly",
  "photoMoment",
  "reservationRecommended",
  "cashPreferred",
  "indoor",
  "outdoor",
] as const;

export const INTELLIGENCE_TEXT_FIELDS = [
  "emotion",
  "bestMoment",
  "durationEstimate",
  "foodType",
] as const;

/** Todas las claves conocidas, para detectar metadata desconocida. */
export const INTELLIGENCE_KNOWN_FIELDS: readonly string[] = [
  ...Object.keys(INTELLIGENCE_ENUM_FIELDS),
  ...INTELLIGENCE_BOOLEAN_FIELDS,
  ...INTELLIGENCE_TEXT_FIELDS,
];
