// Álbum Premium: agrupa los recuerdos por capítulo (día), respetando el ORDEN
// NARRATIVO de la historia — nunca solo la fecha de archivo. Prepara la
// arquitectura del álbum de recuerdos (portadas, resúmenes, cronología) sin
// cambiar todavía la navegación. Nunca elimina ni deduplica: solo lee y agrupa.
//
// Integración futura (favoritos, notas): el resumen ya cuenta favoritos y notas,
// dejando el terreno listo sin acoplar la UI todavía.

import type { Memory } from "@/features/album/data/types";
import type { StoryPackage } from "@/features/story/engine/types";
import { byCreatedAt } from "./memoryGrouping";

export interface AlbumGroupSummary {
  memories: number;
  /** Lugares/actividades distintas con recuerdo. */
  places: number;
  favorites: number;
  withNotes: number;
}

export interface AlbumGroup {
  chapterId: string;
  title: string;
  order: number;
  memories: Memory[];
  /** Id/URL de la foto de portada representativa, o null si el grupo no tiene fotos. */
  cover: string | null;
  summary: AlbumGroupSummary;
}

interface ChapterMeta {
  order: number;
  title: string;
}

function buildChapterMeta(storyPackage: StoryPackage): Map<string, ChapterMeta> {
  const meta = new Map<string, ChapterMeta>();
  storyPackage.chapters.forEach((chapter) => {
    meta.set(chapter.id, { order: chapter.order, title: chapter.title });
  });
  const special = storyPackage.specialChapter;
  if (special?.id) {
    meta.set(special.id, { order: special.order, title: special.title });
  }
  return meta;
}

/** Elige una portada representativa con reglas simples: la primera foto en orden narrativo. */
function pickCover(memories: Memory[]): string | null {
  for (const memory of memories) {
    if (memory.photos.length > 0) return memory.photos[0];
  }
  return null;
}

function summarize(memories: Memory[]): AlbumGroupSummary {
  const places = new Set<string>();
  let favorites = 0;
  let withNotes = 0;
  for (const memory of memories) {
    if (memory.activityId) places.add(memory.activityId);
    if (memory.favorite) favorites += 1;
    if (memory.note.trim().length > 0) withNotes += 1;
  }
  return { memories: memories.length, places: places.size, favorites, withNotes };
}

const UNKNOWN_CHAPTER_ORDER = Number.MAX_SAFE_INTEGER;

/**
 * Agrupa los recuerdos (no archivados) por capítulo, ordenados por el orden
 * narrativo de la historia. Los recuerdos de un capítulo desconocido quedan al
 * final, nunca se pierden.
 */
export function groupMemoriesByChapter(
  memories: Memory[],
  storyPackage: StoryPackage,
): AlbumGroup[] {
  const chapterMeta = buildChapterMeta(storyPackage);
  const byChapter = new Map<string, Memory[]>();

  for (const memory of memories) {
    if (memory.archived) continue;
    const list = byChapter.get(memory.chapterId) ?? [];
    list.push(memory);
    byChapter.set(memory.chapterId, list);
  }

  const groups: AlbumGroup[] = [];
  for (const [chapterId, list] of byChapter) {
    const meta = chapterMeta.get(chapterId);
    const ordered = [...list].sort(byCreatedAt);
    groups.push({
      chapterId,
      title: meta?.title ?? chapterId,
      order: meta?.order ?? UNKNOWN_CHAPTER_ORDER,
      memories: ordered,
      cover: pickCover(ordered),
      summary: summarize(ordered),
    });
  }

  return groups.sort((a, b) => a.order - b.order);
}
