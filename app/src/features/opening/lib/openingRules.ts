import {
  OPENING_MIN_INTERVAL_MS,
  SUPPORTED_OPENING_VARIANT,
  type OpeningVariant,
} from "./openingConstants";

export type OpeningRecord = {
  shownAt: number;
  dayKey: string;
  variant: OpeningVariant;
};

export function getLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createOpeningRecord(
  now = new Date(),
  variant: OpeningVariant = SUPPORTED_OPENING_VARIANT,
): OpeningRecord {
  return {
    shownAt: now.getTime(),
    dayKey: getLocalDayKey(now),
    variant,
  };
}

export function parseOpeningRecord(raw: string | null): OpeningRecord | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const record = parsed as Partial<OpeningRecord>;
    if (typeof record.shownAt !== "number" || !Number.isFinite(record.shownAt)) {
      return null;
    }
    if (typeof record.dayKey !== "string" || record.dayKey.length === 0) {
      return null;
    }
    if (record.variant !== "opening" && record.variant !== "micro" && record.variant !== "sting") {
      return null;
    }

    return {
      shownAt: record.shownAt,
      dayKey: record.dayKey,
      variant: record.variant,
    };
  } catch {
    return null;
  }
}

export function shouldShowOpening({
  record,
  now = new Date(),
  force = false,
}: {
  record: OpeningRecord | null;
  now?: Date;
  force?: boolean;
}): boolean {
  if (force) return true;
  if (!record) return true;

  if (record.dayKey !== getLocalDayKey(now)) return true;

  return now.getTime() - record.shownAt >= OPENING_MIN_INTERVAL_MS;
}

export function isDevOpeningForceEnabled({
  search,
  isDev,
}: {
  search: string;
  isDev: boolean;
}): boolean {
  if (!isDev) return false;

  const params = new URLSearchParams(search);
  return params.get("alaiaOpening") === "1" || params.get("forceAlaiaOpening") === "1";
}
