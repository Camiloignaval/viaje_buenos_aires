// Tipos de la Experiencia Conectada (Etapa 4). El trip lo reutilizamos del feature
// trips; media se tipa laxo: la insignia de estado solo necesita saber si existe,
// no interpretar su contenido (igual que los stores vanilla).

import type { StoryPackage } from "@/features/story/engine/types";

export interface ConnectedStory {
  storyId?: string;
  // El Story Package curado ya validado server-side (getBaseStory lo incluye).
  // Experience lo consume desde acá en vez de importar uno estático.
  storyPackage?: StoryPackage;
  [key: string]: unknown;
}

export interface TripMediaItem {
  id: string;
  [key: string]: unknown;
}
