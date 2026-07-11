// Agrupa y calcula el progreso de los Preparativos (checklist del Story Package).
// Port verbatim de render.js. Solo se muestran las categorías conocidas, en orden.

import type { ChecklistItem, StoryPackage } from "@/features/story/engine/types";

export const PREPARATION_CATEGORY_LABELS = new Map<string, string>([
  ["Documentos", "Documentos"],
  ["Equipaje", "Equipaje"],
  ["Apps instaladas", "Apps"],
  ["Dinero", "Dinero"],
]);

export interface PreparationGroup {
  sourceCategory: string;
  label: string;
  items: ChecklistItem[];
}

export function getPreparationGroups(storyPackage: StoryPackage): PreparationGroup[] {
  const groups = new Map<string, PreparationGroup>();
  for (const item of storyPackage.checklist ?? []) {
    const label = PREPARATION_CATEGORY_LABELS.get(item.category);
    if (!label) {
      continue;
    }
    if (!groups.has(item.category)) {
      groups.set(item.category, { sourceCategory: item.category, label, items: [] });
    }
    groups.get(item.category)!.items.push(item);
  }
  return [...groups.values()];
}

export interface PreparationProgress {
  done: number;
  total: number;
  pct: number;
  complete: boolean;
}

export function computePreparationProgress(
  storyPackage: StoryPackage,
  completedIds: Set<string>,
): PreparationProgress {
  const groups = getPreparationGroups(storyPackage);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const done = groups.reduce(
    (sum, group) =>
      sum + group.items.filter((item) => completedIds.has(item.id)).length,
    0,
  );
  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    complete: total > 0 && done === total,
  };
}
