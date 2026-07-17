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

export interface Activity {
  id: string;
  title: string;
  order?: number;
  moment?: string;
  description?: string;
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
  suggestedMemories?: SuggestedMemory[];
  assets?: StoryAssets;
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
