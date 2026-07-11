import { OPENING_STORAGE_KEY, type OpeningVariant } from "./openingConstants";
import { createOpeningRecord, parseOpeningRecord, type OpeningRecord } from "./openingRules";

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function readOpeningRecord(storage: Storage | undefined = getBrowserStorage()): OpeningRecord | null {
  try {
    return parseOpeningRecord(storage?.getItem(OPENING_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function persistOpeningShown({
  now = new Date(),
  storage = getBrowserStorage(),
  variant,
}: {
  now?: Date;
  storage?: Storage;
  variant: OpeningVariant;
}): void {
  try {
    storage?.setItem(OPENING_STORAGE_KEY, JSON.stringify(createOpeningRecord(now, variant)));
  } catch {
    /* localStorage puede no existir o fallar en modo privado: nunca bloquea la app. */
  }
}
