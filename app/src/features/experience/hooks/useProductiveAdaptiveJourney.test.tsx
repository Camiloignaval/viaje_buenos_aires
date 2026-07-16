import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoStoryPackage } from "../data/demoStory";
import type { User } from "@/features/auth/types";
import type { Trip } from "@/features/trips/types";

const mocks = vi.hoisted(() => ({
  useAdaptiveJourney: vi.fn(),
  getPushPreferences: vi.fn(),
  composeFirstRealExperience: vi.fn(),
  acceptMemoryCandidate: vi.fn((candidate) => ({ ...candidate, outcome: "accepted", lifecycle: "accepted" })),
  persistSemanticMemory: vi.fn(),
}));
vi.mock("./useAdaptiveJourney", () => ({ useAdaptiveJourney: mocks.useAdaptiveJourney }));
vi.mock("@/features/pwa/pushApi", () => ({ getPushPreferences: mocks.getPushPreferences }));
vi.mock("../firstRealExperience", () => ({ composeFirstRealExperience: mocks.composeFirstRealExperience }));
vi.mock("@/features/context-engine/memory", () => ({ acceptMemoryCandidate: mocks.acceptMemoryCandidate }));
vi.mock("../api/semanticMemoryApi", () => ({ persistSemanticMemory: mocks.persistSemanticMemory }));

import { useProductiveAdaptiveJourney } from "./useProductiveAdaptiveJourney";

const NOW = "2026-10-06T12:00:00.000Z";
const USER = { id: "user-1", preferredCurrency: "CLP", residenceCountryCode: "CL" } as User;
const TRIP = {
  id: "trip-1", baseStoryId: "ba-2026", status: "active", role: "owner", updatedAt: NOW,
  startDateTime: "2026-10-03", endDateTime: "2026-10-06",
  destination: { countryCode: "AR", countryName: "Argentina", cityId: "buenos-aires", cityName: "Buenos Aires", timezone: "America/Argentina/Buenos_Aires" },
} as Trip;

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const source = {
  trip: TRIP, user: USER, storyPackage: demoStoryPackage, storyObservedAt: NOW,
  storage: { getStorage: () => new MemoryStorage() },
};

function selected() {
  return {
    id: "decision-weather", kind: "weather_activity", dedupeKey: "weather-1", priority: "normal",
    window: { validUntil: "2026-10-06T16:00:00.000Z", expiresAt: "2026-10-06T16:00:00.000Z" },
  };
}

function transient() {
  return {
    outcome: "transient_composed", decisionRun: { selected: selected() },
    action: { actionId: "action-weather" },
    message: { channel: "in_app", text: "La tarde pide un plan bajo techo." },
    memoryDiscard: { outcome: "discard", reason: "transient_context", type: null },
    deliveryIntents: [{ destination: "in_app", state: "pending", references: ["editorial_message"] }],
  };
}

function memoryResult() {
  return {
    outcome: "composed", decisionRun: { selected: { ...selected(), id: "decision-last", kind: "trip_last_day" } },
    action: { actionId: "action-last" }, message: { channel: "memory", text: "Este viaje llega hoy a su último día." },
    memoryCandidate: { outcome: "candidate", lifecycle: "candidate", type: "trip_last_day", scope: { ownerUserId: "user-1", tripId: "trip-1", storyId: demoStoryPackage.storyId } },
    deliveryIntents: [{ destination: "memory", state: "pending", references: ["editorial_message", "memory_candidate"] }],
  };
}

afterEach(() => vi.resetAllMocks());

describe("useProductiveAdaptiveJourney", () => {
  function arrange(result: unknown) {
    mocks.useAdaptiveJourney.mockReturnValue({ logicalInstant: NOW, livingContext: { resolvedAt: NOW }, activities: [{ id: "one" }, { id: "two" }] });
    mocks.getPushPreferences.mockResolvedValue({ preferences: { enabled: true, beforeTrip: true, duringTrip: true } });
    mocks.composeFirstRealExperience.mockResolvedValue(result);
    mocks.persistSemanticMemory.mockResolvedValue({ status: "persisted", type: "trip_last_day" });
  }

  it("renders only Decision.selected Weather/Light editorial output and never persists MemoryDiscard", async () => {
    arrange(transient());
    const events: Array<{ kind: string }> = [];
    const { result } = renderHook(() => useProductiveAdaptiveJourney({ ...source, observer: (event) => events.push(event) }));

    await waitFor(() => expect(result.current.status).toBe("settled"));
    expect(result.current.viewModel).toEqual({ label: "Alaia", text: "La tarde pide un plan bajo techo." });
    expect(mocks.composeFirstRealExperience.mock.calls[0][0].decision.activities).toHaveLength(2);
    expect(mocks.persistSemanticMemory).not.toHaveBeenCalled();
    expect(events.map(({ kind }) => kind)).toEqual(["adaptive_flow_started", "adaptive_result_layer", "memory_discarded"]);

    await act(async () => { expect(result.current.onVisible?.()).toBe(true); });
    expect(events.at(-1)).not.toEqual({ kind: "memory_persisted" });
  });

  it("accepts and persists a Last Day memory intent once outside render without a visible node", async () => {
    arrange(memoryResult());
    const events: Array<{ kind: string }> = [];
    const { result, rerender } = renderHook(() => useProductiveAdaptiveJourney({ ...source, observer: (event) => events.push(event) }));

    expect(mocks.persistSemanticMemory).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.status).toBe("settled"));
    expect(result.current.viewModel).toBeNull();
    await waitFor(() => expect(mocks.persistSemanticMemory).toHaveBeenCalledTimes(1));
    rerender();
    expect(mocks.acceptMemoryCandidate).toHaveBeenCalledTimes(1);
    expect(mocks.persistSemanticMemory).toHaveBeenCalledTimes(1);
    expect(events.map(({ kind }) => kind)).toContain("memory_persisted");
  });

  it("degrades storage, composition and persistence failures to null silence", async () => {
    arrange(memoryResult());
    mocks.persistSemanticMemory.mockRejectedValue(new Error("offline"));
    const events: Array<{ kind: string }> = [];
    const { result } = renderHook(() => useProductiveAdaptiveJourney({ ...source, observer: (event) => events.push(event) }));
    await waitFor(() => expect(result.current.status).toBe("settled"));
    expect(result.current.viewModel).toBeNull();
    expect(events.map(({ kind }) => kind)).toContain("contextual_silence");
  });
});
