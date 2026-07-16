import type { QueryFunctionContext } from "@tanstack/react-query";
import type { MemoryAccepted } from "@/features/context-engine/memory/contracts";
import { platformRequest } from "@/services/platformClient";

export type LivingMemoryType = "trip_started" | "trip_last_day";
export type LivingMemoryDTO = Readonly<{ type: LivingMemoryType; text: string }>;
export type SemanticMemoryPersistResult = Readonly<{
  status: "persisted" | "duplicate";
  type: LivingMemoryType;
}>;
export type SemanticMemoryPersistInput = Readonly<{ tripId: string; accepted: MemoryAccepted }>;

const ID = /^[A-Za-z0-9._:-]{1,128}$/u;
const UNAVAILABLE_IDENTITY = ["experience", "semantic-memory", "unavailable", "unavailable"] as const;
const MEMORY_TEXT = Object.freeze({
  trip_started: new Set(["Hoy comienza una nueva historia.", "El viaje empieza hoy, a su propio ritmo."]),
  trip_last_day: new Set(["Hoy es el último día de este viaje.", "Este viaje llega hoy a su último día."]),
});

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function livingMemory(value: unknown): LivingMemoryDTO | null {
  if (!exactKeys(value, ["type", "text"])
    || (value.type !== "trip_started" && value.type !== "trip_last_day")
    || typeof value.text !== "string"
    || !MEMORY_TEXT[value.type].has(value.text)) return null;
  return Object.freeze({ type: value.type, text: value.text });
}

function persistedResult(value: unknown): SemanticMemoryPersistResult | null {
  if (!exactKeys(value, ["status", "type"])
    || (value.status !== "persisted" && value.status !== "duplicate")
    || (value.type !== "trip_started" && value.type !== "trip_last_day")) return null;
  return Object.freeze({ status: value.status, type: value.type });
}

function acceptedForTrip(value: MemoryAccepted, tripId: string): boolean {
  return value?.outcome === "accepted"
    && value.lifecycle === "accepted"
    && (value.type === "trip_started" || value.type === "trip_last_day")
    && value.origin === "companion_editorial"
    && value.scope?.tripId === tripId
    && typeof value.scope.ownerUserId === "string"
    && typeof value.scope.storyId === "string";
}

export async function fetchLatestSemanticMemory({
  tripId,
  storyId,
  signal,
}: Readonly<{ tripId: string; storyId: string; signal?: AbortSignal }>): Promise<LivingMemoryDTO | null> {
  if (!ID.test(tripId) || !ID.test(storyId)) return null;
  try {
    const response = await platformRequest<unknown>(
      `/api/trips/${encodeURIComponent(tripId)}/semantic-memories?storyId=${encodeURIComponent(storyId)}`,
      { signal },
    );
    if (!exactKeys(response, ["memory"])) return null;
    return response.memory === null ? null : livingMemory(response.memory);
  } catch {
    return null;
  }
}

export async function persistSemanticMemory(
  input: SemanticMemoryPersistInput & Readonly<{ signal?: AbortSignal }>,
): Promise<SemanticMemoryPersistResult> {
  const { tripId, accepted, signal } = input;
  if (!ID.test(tripId) || !acceptedForTrip(accepted, tripId)) throw new Error("semantic_memory_persist_failed");
  try {
    const response = await platformRequest<unknown>(
      `/api/trips/${encodeURIComponent(tripId)}/semantic-memories`,
      { method: "POST", body: accepted, signal },
    );
    const result = persistedResult(response);
    if (!result || result.type !== accepted.type) throw new Error("semantic_memory_persist_failed");
    return result;
  } catch {
    throw new Error("semantic_memory_persist_failed");
  }
}

export function semanticMemoryQueryOptions(tripId: string, storyId: string) {
  const enabled = ID.test(tripId) && ID.test(storyId);
  const queryKey = enabled
    ? ["experience", "semantic-memory", tripId, storyId] as const
    : UNAVAILABLE_IDENTITY;
  return {
    queryKey,
    queryFn: ({ signal }: QueryFunctionContext<typeof queryKey>) => enabled
      ? fetchLatestSemanticMemory({ tripId, storyId, signal })
      : Promise.resolve(null),
    enabled,
    retry: false as const,
  };
}

export function semanticMemoryMutationOptions() {
  return {
    mutationKey: ["experience", "semantic-memory", "persist"] as const,
    mutationFn: persistSemanticMemory,
  };
}
