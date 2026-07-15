import { LIVING_CONTEXT_FRESHNESS_MS } from "./livingContextConstants";
import type { LivingContextModuleName, LivingContextReason, ModuleResult } from "./types";

export function unavailableResult<T>(reason: LivingContextReason, source = "none", owner: ModuleResult<T>["provenance"]["owner"] = "none"): ModuleResult<T> {
  return { status: "unavailable", value: null, reason, freshness: "unavailable", provenance: { owner, source, observedAt: null } };
}

export function availableResult<T>(module: LivingContextModuleName, value: T, owner: ModuleResult<T>["provenance"]["owner"], source: string, observedAt: string | null | undefined, now: Date, override?: "fresh" | "stale"): ModuleResult<T> {
  let freshness: "fresh" | "stale" = override ?? "fresh";
  if (!override && observedAt) {
    const timestamp = Date.parse(observedAt);
    freshness = !Number.isFinite(timestamp) || now.getTime() - timestamp > LIVING_CONTEXT_FRESHNESS_MS[module] ? "stale" : "fresh";
  }
  return { status: "available", value, reason: null, freshness, provenance: { owner, source, observedAt: observedAt ?? null } };
}

export function categoricalFinancialSource(source: string | null | undefined): string {
  if (source === "frankfurter" || source === "provider") return "financial.provider";
  if (source === "cache" || source === "memory-cache" || source === "mongo-cache") return "financial.cache";
  return "financial.adapter";
}
