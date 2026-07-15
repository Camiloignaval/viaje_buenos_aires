import type { LivingContextModuleName, LivingContextReason } from "./types";

export const LIVING_CONTEXT_REASONS = [
  "missing_destination", "missing_dates", "invalid_timezone", "missing_financial_input",
  "pending", "financial_failed", "missing_story", "story_mismatch",
  "missing_weather_input", "weather_outside_window", "weather_pending",
  "weather_failed", "weather_refresh_failed",
] as const satisfies readonly LivingContextReason[];

export const LIVING_CONTEXT_FRESHNESS_MS = {
  destination: 86_400_000,
  temporal: 60_000,
  financial: 3_600_000,
  narrative: 86_400_000,
  weather: 900_000,
} as const satisfies Record<LivingContextModuleName, number>;
