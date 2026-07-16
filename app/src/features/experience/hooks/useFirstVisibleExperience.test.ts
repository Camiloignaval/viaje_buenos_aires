import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { demoStoryPackage } from "@/features/experience/data/demoStory";
import type { Trip } from "@/features/trips/types";

const { getPushPreferences } = vi.hoisted(() => ({ getPushPreferences: vi.fn() }));
vi.mock("@/features/pwa/pushApi", () => ({ getPushPreferences }));

import {
  createFirstVisibleExperienceInput,
  useFirstVisibleExperience,
} from "./useFirstVisibleExperience";

const INSTANT = "2026-10-03T15:00:00.000Z";
const STORY_OBSERVED_AT = "2026-10-03T14:58:00.000Z";
const USER: User = {
  id: "user-1",
  email: "private@example.com",
  displayName: "Kari",
  residenceCountryCode: "CL",
  preferredCurrency: "CLP",
  emailVerifiedAt: INSTANT,
  onboardingCompleted: true,
};
const TRIP: Trip = {
  id: "trip-1",
  title: "Viaje privado",
  destination: {
    countryCode: "AR",
    countryName: "Argentina",
    cityId: "buenos-aires",
    cityName: "Buenos Aires",
    latitude: -34.6037,
    longitude: -58.3816,
    timezone: "America/Argentina/Buenos_Aires",
  },
  baseStoryId: "ba-2026",
  status: "active",
  role: "owner",
  updatedAt: "2026-10-03T14:55:00.000Z",
  startDateTime: "2026-10-03",
  endDateTime: "2026-10-06",
};
const ENABLED_PREFERENCES = {
  enabled: true,
  beforeTrip: true,
  duringTrip: true,
  afterTrip: true,
  futureMemories: true,
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  getPushPreferences.mockReset();
});

describe("createFirstVisibleExperienceInput", () => {
  it("Authorized inputs: maps current trip/user/story and one caller-owned logical instant", () => {
    const mapped = createFirstVisibleExperienceInput({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
    }, INSTANT, ENABLED_PREFERENCES);

    expect(mapped.logicalInstant).toBe(INSTANT);
    expect(mapped.livingContext).toEqual({
      trip: TRIP,
      user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      story: { baseStoryId: "ba-2026", package: demoStoryPackage },
      observedAt: { trip: TRIP.updatedAt, story: STORY_OBSERVED_AT },
    });
    expect(mapped.decision).toMatchObject({
      tripId: "trip-1",
      preferences: { enabled: true, beforeTrip: true, duringTrip: true },
      activities: [],
    });
    expect(mapped.companion).toMatchObject({ preferences: { enabled: true }, history: [] });
    expect(mapped.memory).toEqual({
      scope: { ownerUserId: "user-1", tripId: "trip-1", storyId: demoStoryPackage.storyId },
      facts: { firstChapterAlreadyOpened: false },
    });
  });

  it("uses fresh empty caller-owned collections on each mapping without durable dedupe claims", () => {
    const props = { trip: TRIP, user: USER, storyPackage: demoStoryPackage, storyObservedAt: STORY_OBSERVED_AT };
    const first = createFirstVisibleExperienceInput(props, INSTANT, ENABLED_PREFERENCES);
    const second = createFirstVisibleExperienceInput(props, INSTANT, ENABLED_PREFERENCES);

    expect(first.decision.processedKeys).toEqual(new Set());
    expect(first.companion.processedKeys).toEqual(new Set());
    expect(first.decision.activities).toEqual([]);
    expect(first.companion.history).toEqual([]);
    expect(first.decision.processedKeys).not.toBe(second.decision.processedKeys);
    expect(first.companion.processedKeys).not.toBe(second.companion.processedKeys);
    expect(first.companion.history).not.toBe(second.companion.history);
  });
});

describe("useFirstVisibleExperience", () => {
  it("runs the real five-engine composer and exposes only the settled view model plus observer", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: ENABLED_PREFERENCES });
    const events: Array<{ kind: string }> = [];
    const props = {
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      observer: (event: { kind: string }) => events.push(event),
    };

    const { result, rerender } = renderHook(() => useFirstVisibleExperience(props));
    expect(result.current).toMatchObject({ status: "loading", viewModel: null });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    await waitFor(() => expect(result.current.status).toBe("settled"));
    expect(result.current.viewModel).toEqual({ label: "Alaia", text: "Hoy comienza una nueva historia." });
    expect(result.current.observer).toBe(props.observer);
    expect(events).toEqual([{ kind: "flow_started" }, { kind: "result_layer" }]);

    vi.setSystemTime(new Date("2026-10-03T20:00:00.000Z"));
    rerender();
    expect(getPushPreferences).toHaveBeenCalledTimes(1);
    expect(result.current.viewModel).toEqual({ label: "Alaia", text: "Hoy comienza una nueva historia." });
  });

  it("settles fail-closed for an authorized terminal without storage, fallback or bypass", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: { ...ENABLED_PREFERENCES, enabled: false } });
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    const events: Array<{ kind: string }> = [];

    const { result } = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      observer: (event) => events.push(event),
    }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    await waitFor(() => expect(result.current.status).toBe("settled"));

    expect(result.current.viewModel).toBeNull();
    expect(events).toEqual([
      { kind: "flow_started" },
      { kind: "result_layer" },
      { kind: "silence" },
    ]);
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it("settles silent when preferences or required inputs are unavailable", async () => {
    getPushPreferences.mockRejectedValue(new Error("network unavailable private@example.com"));
    const events: Array<{ kind: string }> = [];
    const { result } = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      observer: (event) => events.push(event),
    }));

    await waitFor(() => expect(result.current.status).toBe("settled"));
    expect(result.current.viewModel).toBeNull();
    expect(events).toEqual([{ kind: "flow_started" }, { kind: "silence" }]);

    const missing = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: null,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
    }));
    expect(missing.result.current).toMatchObject({ status: "settled", viewModel: null });
  });
});
