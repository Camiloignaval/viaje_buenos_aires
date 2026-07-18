// Tipos del dominio narrativo de Alaia (Story Package + Story Engine). Port
// TS de la forma que ya validan storyPackage.js/storyProgress.js/storyEngine.js.
// Los muchos campos opcionales reflejan STORY_PACKAGE_SCHEMA_v1.4: casi todo el
// contenido de un capítulo es opcional y el render decide si pintarlo o no.

import type { StoryIntelligence } from "./intelligence";

export type { StoryIntelligence } from "./intelligence";

export const ChapterStatus = {
  LOCKED: "locked",
  AVAILABLE: "available",
  STARTED: "started",
  COMPLETED: "completed",
} as const;

export type ChapterStatusValue =
  (typeof ChapterStatus)[keyof typeof ChapterStatus];

export const StoryMode = {
  PRE_TRIP: "pre_trip",
  IN_PROGRESS: "in_progress",
  EPILOGUE: "epilogue",
  MEMORY_MODE: "memory_mode",
} as const;

export type StoryModeValue = (typeof StoryMode)[keyof typeof StoryMode];

export interface UnlockRule {
  requiresDateReached?: boolean;
  requiresPreviousChapterCompleted?: boolean;
  /** Hora local del destino (HH:mm) a partir de la que el día queda disponible. */
  localTime?: string;
}

export interface PlaceLocation {
  name?: string;
  googleMapsUrl?: string;
  uberDeepLink?: string;
  cabifyDeepLink?: string;
}

export interface Place {
  id: string;
  name: string;
  location?: PlaceLocation;
  websiteUrl?: string;
  recommendation?: string;
  relatedChapterId?: string;
  /**
   * Nivel de precio editorial (banda estable, nunca monto exacto): "$", "$$",
   * "$$$", "$$$$". Curado a partir de la naturaleza conocida del lugar; se
   * mantiene consistente entre historias y no envejece como un precio.
   */
  priceLevel?: string;
  /** Costo aproximado editorial del lugar (comida, entrada, etc.). */
  estimatedCost?: EstimatedCost;
  /** Metadata de significado (opcional): reserva, tipo de comida, etc. */
  intelligence?: StoryIntelligence;
}

export interface ContextWindow {
  validFrom: string;
  validUntil: string;
  timezone: string;
}

export interface SuggestedMemory {
  id: string;
  relatedActivityId?: string | null;
  type?: string;
  prompt: string;
}

/**
 * Costo aproximado editorial. `type` decide cómo se muestra:
 * - "range" / "fixed": monto(s) en `currency` (ARS o CLP), con conversión
 *   aproximada a la moneda del usuario si hay tasa.
 * - "free": "Entrada gratuita". "included": "Incluido". "variable": "Costo
 *   variable". "alreadyPaid": "Coordinado aparte".
 * Nunca un monto exacto que envejezca: es una franja curada. `basis` (couple/
 * person/…) e `includes` dan contexto humano.
 */
export interface EstimatedCost {
  type: string;
  basis?: string;
  min?: number;
  max?: number;
  amount?: number;
  currency?: string;
  includes?: string;
  note?: string;
  confidence?: string;
}

/**
 * Datos prácticos de viaje de una actividad (texto curado, todo opcional). No es
 * ficha técnica ni tarjeta: alimenta la franja editorial de hechos (hora·lugar·
 * duración) y el pliegue "Cómo llegar y datos prácticos". Los campos aquí
 * tipados son los que hoy se renderizan; el resto de cues curados (foto, memoria,
 * pasos) conviven vía la firma de índice sin obligar a enumerarlos.
 */
export interface ActivityPractical {
  /** Duración aproximada en texto libre (ej. "45–60 min"). */
  estimatedDuration?: string;
  /** Qué pedir, para lugares gastronómicos (ej. ["Fugazzeta", "Pizza de jamón"]). */
  suggestedOrder?: string[];
  /** Reserva en texto curado (ej. "Recomendada", "No suele ser necesaria"). */
  reservation?: string;
  /** Nota de clima / compatibilidad con lluvia. */
  weatherNote?: string;
  /** Consejo puntual de quien ya estuvo ahí. */
  experienceTip?: string;
  /** Secuencia o ruta del recorrido. */
  route?: string[];
  /** Nivel de precio editorial de la actividad, si no viene del Place. */
  priceLevel?: string;
  /** Costo aproximado de la actividad (entrada, transporte, comida sin place). */
  estimatedCost?: EstimatedCost;
  [key: string]: unknown;
}

export interface Activity {
  id: string;
  title: string;
  order?: number;
  /**
   * Tratamiento narrativo especial (reutilizable por cualquier historia):
   * - "instante": una respiración, no una actividad. Página pequeña y callada,
   *   sin datos prácticos ni marginalia — solo el momento y, si acaso, una foto.
   * - "ceremonia": el pico cinematográfico del día (ej. la toma con dron).
   * Ausente = pasaje normal.
   */
  kind?: "instante" | "ceremonia";
  /** Fase narrativa del día (ej. "departure" antes de llegar, "arrival" al aterrizar). */
  narrativePhase?: string;
  moment?: string;
  description?: string;
  /** Detalle editorial que solo conoce alguien que ya estuvo ahí; voz de Alaia, nunca ficha técnica. */
  insight?: string;
  timeWindow?: string;
  category?: string;
  location?: PlaceLocation;
  websiteUrl?: string;
  relatedPlaceId?: string;
  image?: string;
  /** Metadata de significado (opcional): energía, clima, foto, etc. */
  intelligence?: StoryIntelligence;
  /** Structured curated window for contextual decisions; never derived from `timeWindow`. */
  contextWindow?: ContextWindow;
  /** Datos prácticos de viaje (qué pedir, reserva, duración, clima, consejo…). */
  practical?: ActivityPractical;
}

export interface ChapterCopy {
  open?: string;
  close?: string;
}

/** Assets asociados a un capítulo o al paquete (imagen hero, etc.). */
export interface StoryAssets {
  heroImage?: string;
  introVideo?: string;
  [key: string]: unknown;
}

export interface Tradition {
  title: string;
  body: string;
}

/** Fase narrativa de un día (departure/arrival…), con su copy editorial. */
export interface NarrativePhase {
  id: string;
  title?: string;
  copy?: string;
  availableFrom?: string;
  startsWhen?: string;
  endsWhen?: string;
}

/** Umbral manual de llegada; nunca depende de sensores ni permisos del dispositivo. */
export interface ArrivalGate {
  destination?: string;
  mode?: "manual";
  confirmationCopy?: string;
  confirmLabel?: string;
}

export interface Chapter {
  id: string;
  order: number;
  title: string;
  date?: string;
  unlockRule?: UnlockRule;
  copy?: ChapterCopy;
  activities?: Activity[];
  traditions?: Tradition[];
  microDiscoveries?: string[];
  nightNote?: string;
  ourMoment?: string;
  /** Cómo flexiona el día si el clima o el cansancio cambian el plan (contingencia autoral, ya escrita). */
  planB?: string;
  /** Qué hacer si el día da para más de lo previsto. */
  extraTime?: string;
  suggestedMemories?: SuggestedMemory[];
  assets?: StoryAssets;
  /** Fases del día (departure/arrival) y su copy, si el día tiene umbral de llegada. */
  narrativePhases?: NarrativePhase[];
  /** Umbral de llegada al destino (opcional). */
  arrivalGate?: ArrivalGate;
  /** Título de la fase de llegada (ej. "Bienvenidos a Buenos Aires"). */
  arrivalTitle?: string;
  [key: string]: unknown;
}

export interface EpiloguePrompt {
  id: string;
  label: string;
  type?: string;
  retrospectiveSource?: string;
  memoryType?: string;
  sourceCategory?: string;
  creationPrompt?: string;
  selectionPrompt?: string;
}

export interface SpecialChapter extends Chapter {
  date: string;
  kind: string;
  breaksNarrativeRules: {
    hasSchedule: boolean;
    hasMap: boolean;
    hasItinerary: boolean;
  };
  prompts: EpiloguePrompt[];
}

export interface PlacesCatalog {
  restaurants?: Place[];
  cafes?: Place[];
}

export interface PhotoSpot {
  id: string;
  title: string;
  relatedChapterId?: string;
  bestTime?: string;
  tip?: string;
  /** Dónde pararse para la toma (texto curado). */
  location?: PlaceLocation;
  /** Fotografía de referencia del spot, si existe. */
  image?: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  relatedChapterId?: string;
  suggestedWhereToBuy?: string;
  // estimatedPrice es texto libre legacy (monto único, rango o "Variable").
  // currency acompaña al monto en el contenido curado pero no siempre permite
  // normalizar a Money con seguridad (ver context-engine/money.ts): rangos y
  // texto libre se muestran tal cual, sin conversión.
  estimatedPrice?: string;
  currency?: string;
}

export interface Collection {
  id: string;
  title: string;
  items?: CollectionItem[];
}

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
}

export interface TravelDates {
  start: string;
  end: string;
}

export interface StoryMetadata {
  origin?: string;
  destination: string;
  title: string;
  travelDates: TravelDates;
  travelerNames?: string[];
  /** Idioma en que está escrito el contenido de la historia. */
  language: string;
  /** País del destino (ISO 3166-1 alpha-2), para resolver el Travel Context. */
  destinationCountryCode?: string;
  /** Idioma predominante del destino (ISO 639-1), si difiere del contenido. */
  destinationLanguage?: string;
  /** Zona IANA que gobierna el calendario narrativo de este package. */
  experienceTimezone?: string;
  /** Metadata curada opcional para Living Context; ausente en packages legacy. */
  livingContext?: {
    countryCode?: string;
    locale?: string;
    timezone?: string;
    currency?: string;
  };
}

/** Presupuesto editorial de la historia; su moneda es la moneda local del destino. */
export interface StoryBudget {
  currency?: string;
  [key: string]: unknown;
}

export interface StoryMood {
  primary: string;
  [key: string]: unknown;
}

export interface BaseCopy {
  welcomeMessage: string;
  dailyOpenTemplate: string;
  dailyCloseTemplate: string;
  finalLetter?: string;
  [key: string]: unknown;
}

export interface StoryPackage {
  storyId: string;
  schemaVersion: string;
  metadata: StoryMetadata;
  storyMood: StoryMood;
  unlockRulesDefault: UnlockRule;
  chapters: Chapter[];
  specialChapter?: SpecialChapter | null;
  placesCatalog?: PlacesCatalog;
  photoSpots?: PhotoSpot[];
  collections?: Collection[];
  checklist?: ChecklistItem[];
  budget?: StoryBudget;
  baseCopy: BaseCopy;
  assets?: StoryAssets;
  [key: string]: unknown;
}

/** Estado por capítulo, tal como lo persiste progressStore (chapterId → estado). */
export type ChapterStatuses = Record<string, ChapterStatusValue>;

export interface StoryContext {
  now: Date | string;
  chapterStatuses?: ChapterStatuses;
  /** Zona IANA del Trip conectado; prevalece sobre la metadata del package. */
  timezone?: string;
}

export type VisibleChapter = Chapter & { status: ChapterStatusValue };

export interface NextUnlock {
  chapterId: string;
  date: Date;
}

export interface StoryView {
  currentMode: StoryModeValue;
  visibleChapter: VisibleChapter | null;
  lockedChapters: string[];
  availableChapters: string[];
  completedChapters: string[];
  nextUnlock: NextUnlock | null;
  specialChapterStatus: ChapterStatusValue | null;
  memoryModeAvailable: boolean;
}
