import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemoryAccepted } from "@/features/context-engine/memory/contracts";
import {
  fetchLatestSemanticMemory,
  persistSemanticMemory,
  semanticMemoryMutationOptions,
  semanticMemoryQueryOptions,
} from "./semanticMemoryApi";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

function accepted(type: "trip_started" | "trip_last_day" = "trip_started"): MemoryAccepted {
  const lastDay = type === "trip_last_day";
  const kind = lastDay ? "trip_last_day" : "trip_start_today";
  const decisionId = `decision:${kind}:trip-1`;
  return {
    outcome: "accepted", lifecycle: "accepted", type, origin: "companion_editorial",
    occurredAt: "2026-10-03T15:00:00.000Z",
    scope: { ownerUserId: "user-1", tripId: "trip-1", storyId: "story-1" },
    decisionRef: { id: decisionId, kind },
    editorialRef: { catalogVersion: "editorial-v1", variantId: lastDay ? "last-day-01" : "today-01" },
    evidence: [{ kind: "companion_action", ref: decisionId }],
    meaning: { code: type, text: lastDay ? "Hoy es el último día de este viaje." : "Hoy comienza una nueva historia." },
    retention: { reason: "trip_milestone", explanation: "travel_milestone_worth_recalling" },
    dedupe: { version: "memory-key-v1", sourceSlot: decisionId },
  };
}

describe("semanticMemoryApi", () => {
  it("GET usa identidad trip/story estable y acepta solo el DTO exacto type/text", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      memory: { type: "trip_started", text: "Hoy comienza una nueva historia." },
    }), { status: 200 }));
    const options = semanticMemoryQueryOptions("trip-1", "story-1");

    expect(options).toMatchObject({
      queryKey: ["experience", "semantic-memory", "trip-1", "story-1"],
      enabled: true,
      retry: false,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    await expect(options.queryFn({ signal: new AbortController().signal } as never)).resolves.toEqual({
      type: "trip_started", text: "Hoy comienza una nueva historia.",
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/trips/trip-1/semantic-memories?storyId=story-1",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("GET degrada ausencia, DTO inexacto y error de red a null sin filtrar detalles", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ memory: null }), { status: 200 }));
    await expect(fetchLatestSemanticMemory({ tripId: "trip-1", storyId: "story-1" })).resolves.toBeNull();

    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      memory: { type: "trip_started", text: "Hoy comienza una nueva historia.", memoryKey: "private" },
    }), { status: 200 }));
    await expect(fetchLatestSemanticMemory({ tripId: "trip-1", storyId: "story-1" })).resolves.toBeNull();

    globalThis.fetch = vi.fn(async () => { throw new Error("PRIVATE_STORAGE_ERROR owner=user-1"); });
    await expect(fetchLatestSemanticMemory({ tripId: "trip-1", storyId: "story-1" })).resolves.toBeNull();
  });

  it("POST envía solo MemoryAccepted y valida la proyección persisted/duplicate", async () => {
    const input = accepted("trip_last_day");
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      status: "persisted", type: "trip_last_day",
    }), { status: 200 }));

    await expect(persistSemanticMemory({ tripId: "trip-1", accepted: input })).resolves.toEqual({
      status: "persisted", type: "trip_last_day",
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/trips/trip-1/semantic-memories",
      expect.objectContaining({ method: "POST", credentials: "include", body: JSON.stringify(input) }),
    );

    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      status: "duplicate", type: "trip_started",
    }), { status: 200 }));
    await expect(persistSemanticMemory({ tripId: "trip-1", accepted: accepted() })).resolves.toEqual({
      status: "duplicate", type: "trip_started",
    });
  });

  it("mutation options no persiste durante render/configuración y sanitiza respuestas/errores", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      status: "persisted", type: "trip_started", memoryKey: "private",
    }), { status: 200 }));
    const options = semanticMemoryMutationOptions();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    await expect(options.mutationFn({ tripId: "trip-1", accepted: accepted() })).rejects.toThrow(/^semantic_memory_persist_failed$/);

    globalThis.fetch = vi.fn(async () => { throw new Error("PRIVATE_STORAGE_ERROR owner=user-1"); });
    await expect(options.mutationFn({ tripId: "trip-1", accepted: accepted() })).rejects.toThrow(/^semantic_memory_persist_failed$/);
  });

  it("deshabilita GET sin trip/story y conserva identidades separadas", () => {
    const disabled = semanticMemoryQueryOptions("", "story-1");
    const otherTrip = semanticMemoryQueryOptions("trip-2", "story-1");
    const otherStory = semanticMemoryQueryOptions("trip-1", "story-2");

    expect(disabled.enabled).toBe(false);
    expect(disabled.queryKey).toEqual(["experience", "semantic-memory", "unavailable", "unavailable"]);
    expect(otherTrip.queryKey).not.toEqual(otherStory.queryKey);
  });
});
