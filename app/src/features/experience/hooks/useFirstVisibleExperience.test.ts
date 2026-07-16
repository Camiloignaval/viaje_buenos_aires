import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { demoStoryPackage } from "@/features/experience/data/demoStory";
import type { Trip } from "@/features/trips/types";
import { VisibleCompanionExperience } from "../components/VisibleCompanionExperience";
import {
  buildVisibleDeliverySessionKey,
  createPendingVisibleDeliveryReceipt,
  transitionVisibleDeliveryReceipt,
  writeVisibleDeliverySession,
  type VisibleDeliveryCompanionSnapshot,
  type VisibleDeliveryStorage,
} from "../lib/visibleDeliverySession";

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

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

class ToggleWriteStorage extends MemoryStorage {
  failDocumentWrites = false;
  override setItem(key: string, value: string) {
    if (this.failDocumentWrites && !key.endsWith(":probe")) throw new DOMException("quota");
    super.setItem(key, value);
  }
}

function storageDependency(storage = new MemoryStorage()): VisibleDeliveryStorage {
  return Object.freeze({ getStorage: () => storage });
}

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

  it("maps visible delivery evidence into fresh Decision and Companion inputs", () => {
    const delivery: VisibleDeliveryCompanionSnapshot = {
      decisionProcessedKeys: new Set(["visible-key"]),
      companionProcessedKeys: new Set(["visible-key"]),
      history: [{ dedupeKey: "visible-key", priority: "high", processedAt: INSTANT }],
    };
    const source = { trip: TRIP, user: USER, storyPackage: demoStoryPackage, storyObservedAt: STORY_OBSERVED_AT };
    const first = createFirstVisibleExperienceInput(source, INSTANT, ENABLED_PREFERENCES, delivery);
    const second = createFirstVisibleExperienceInput(source, INSTANT, ENABLED_PREFERENCES, delivery);

    expect(first.decision.processedKeys).toEqual(new Set(["visible-key"]));
    expect(first.companion.processedKeys).toEqual(new Set(["visible-key"]));
    expect(first.companion.history).toEqual(delivery.history);
    expect(first.decision.processedKeys).not.toBe(delivery.decisionProcessedKeys);
    expect(first.companion.processedKeys).not.toBe(delivery.companionProcessedKeys);
    expect(first.companion.history).not.toBe(delivery.history);
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
      storage: storageDependency(),
    };

    const { result, rerender } = renderHook(() => useFirstVisibleExperience(props));
    expect(result.current).toMatchObject({ status: "loading", viewModel: null });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    await waitFor(() => expect(result.current.status).toBe("settled"));
    expect(result.current.viewModel).toEqual({ label: "Alaia", text: "Hoy comienza una nueva historia." });
    expect(result.current.observer).toBe(props.observer);
    expect(events).toEqual([
      { kind: "flow_started" },
      { kind: "result_layer" },
      { kind: "delivery_pending" },
    ]);

    vi.setSystemTime(new Date("2026-10-03T20:00:00.000Z"));
    rerender();
    expect(getPushPreferences).toHaveBeenCalledTimes(1);
    expect(result.current.viewModel).toEqual({ label: "Alaia", text: "Hoy comienza una nueva historia." });
  });

  it("settles fail-closed for an authorized terminal without storage, fallback or bypass", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: { ...ENABLED_PREFERENCES, enabled: false } });
    const storage = new MemoryStorage();
    const events: Array<{ kind: string }> = [];

    const { result } = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      observer: (event) => events.push(event),
      storage: storageDependency(storage),
    }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    await waitFor(() => expect(result.current.status).toBe("settled"));

    expect(result.current.viewModel).toBeNull();
    expect(events).toEqual([
      { kind: "flow_started" },
      { kind: "result_layer" },
      { kind: "silence" },
    ]);
    expect(storage.getItem(buildVisibleDeliverySessionKey({ userId: USER.id, tripId: TRIP.id }))).toBeNull();
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
      storage: storageDependency(),
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

  it("observes the exact visible lifecycle without reinvoking the domain on dismiss", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: ENABLED_PREFERENCES });
    const events: Array<{ kind: string }> = [];
    const observer = (event: { kind: string }) => events.push(event);
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      observer,
      storage: storageDependency(storage),
    }));

    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    await waitFor(() => expect(result.current.status).toBe("settled"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(createElement(VisibleCompanionExperience, {
      viewModel: result.current.viewModel,
      observer: result.current.observer,
      onVisible: result.current.onVisible,
      onDismiss: result.current.onDismiss,
    }));
    await user.click(screen.getByRole("button", { name: "Cerrar mensaje de Alaia" }));

    expect(events).toEqual([
      { kind: "flow_started" },
      { kind: "result_layer" },
      { kind: "delivery_pending" },
      { kind: "render_success" },
      { kind: "dismiss" },
    ]);
    expect(getPushPreferences).toHaveBeenCalledTimes(1);
    const stored = storage.getItem(buildVisibleDeliverySessionKey({ userId: USER.id, tripId: TRIP.id }));
    expect(stored && JSON.parse(stored).receipts[0].state).toBe("dismissed");
  });

  it("preserves same-trip continuity across remount while pending retries before visibility", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: ENABLED_PREFERENCES });
    const storage = new MemoryStorage();
    const props = {
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      storage: storageDependency(storage),
    };

    const pendingMount = renderHook(() => useFirstVisibleExperience(props));
    await waitFor(() => expect(pendingMount.result.current.viewModel).not.toBeNull());
    pendingMount.unmount();

    const retryMount = renderHook(() => useFirstVisibleExperience(props));
    await waitFor(() => expect(retryMount.result.current.viewModel).not.toBeNull());
    render(createElement(VisibleCompanionExperience, {
      viewModel: retryMount.result.current.viewModel,
      observer: retryMount.result.current.observer,
      onVisible: retryMount.result.current.onVisible,
      onDismiss: retryMount.result.current.onDismiss,
    }));
    expect(await screen.findByRole("complementary", { name: "Alaia" })).toBeInTheDocument();
    retryMount.unmount();

    const returnMount = renderHook(() => useFirstVisibleExperience(props));
    await waitFor(() => expect(returnMount.result.current.status).toBe("settled"));
    expect(returnMount.result.current.viewModel).toBeNull();
    expect(getPushPreferences).toHaveBeenCalledTimes(3);
  });

  it("isolates user and trip scopes and restores the original visible receipt", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: ENABLED_PREFERENCES });
    const storage = new MemoryStorage();
    const mount = async (trip: Trip, user: User) => {
      const hook = renderHook(() => useFirstVisibleExperience({
        trip,
        user,
        storyPackage: demoStoryPackage,
        storyObservedAt: STORY_OBSERVED_AT,
        storage: storageDependency(storage),
      }));
      await waitFor(() => expect(hook.result.current.status).toBe("settled"));
      return hook;
    };
    const confirm = (hook: Awaited<ReturnType<typeof mount>>) => {
      expect(hook.result.current.onVisible?.()).toBe(true);
      hook.unmount();
    };

    const original = await mount(TRIP, USER);
    expect(original.result.current.viewModel).not.toBeNull();
    confirm(original);

    const otherTrip = await mount({ ...TRIP, id: "trip-2" }, USER);
    expect(otherTrip.result.current.viewModel).not.toBeNull();
    otherTrip.unmount();

    const otherUser = await mount(TRIP, { ...USER, id: "user-2" });
    expect(otherUser.result.current.viewModel).not.toBeNull();
    otherUser.unmount();

    const restored = await mount(TRIP, USER);
    expect(restored.result.current.viewModel).toBeNull();
  });

  it.each(["unavailable", "corrupt"] as const)("fails silent before composition when storage is %s", async (mode) => {
    const storage = new MemoryStorage();
    const dependencies: VisibleDeliveryStorage = mode === "unavailable"
      ? { getStorage: () => { throw new Error("blocked private@example.com"); } }
      : storageDependency(storage);
    if (mode === "corrupt") {
      storage.setItem(buildVisibleDeliverySessionKey({ userId: USER.id, tripId: TRIP.id }), "{");
    }
    const events: Array<{ kind: string }> = [];
    const { result } = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      storage: dependencies,
      observer: (event) => events.push(event),
    }));

    await waitFor(() => expect(result.current.status).toBe("settled"));
    expect(result.current.viewModel).toBeNull();
    expect(events).toEqual([{ kind: "flow_started" }, { kind: "silence" }]);
    expect(getPushPreferences).not.toHaveBeenCalled();
  });

  it("fails silent when pending or visible receipt writes become unavailable", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: ENABLED_PREFERENCES });
    const pendingFailure = new ToggleWriteStorage();
    pendingFailure.failDocumentWrites = true;
    const pendingEvents: Array<{ kind: string }> = [];
    const first = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      storage: storageDependency(pendingFailure),
      observer: (event) => pendingEvents.push(event),
    }));
    await waitFor(() => expect(first.result.current.status).toBe("settled"));
    expect(first.result.current.viewModel).toBeNull();
    expect(pendingEvents).toEqual([
      { kind: "flow_started" },
      { kind: "result_layer" },
      { kind: "silence" },
    ]);
    first.unmount();

    const visibleFailure = new ToggleWriteStorage();
    const visibleEvents: Array<{ kind: string }> = [];
    const second = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      storage: storageDependency(visibleFailure),
      observer: (event) => visibleEvents.push(event),
    }));
    await waitFor(() => expect(second.result.current.viewModel).not.toBeNull());
    visibleFailure.failDocumentWrites = true;
    render(createElement(VisibleCompanionExperience, {
      viewModel: second.result.current.viewModel,
      observer: second.result.current.observer,
      onVisible: second.result.current.onVisible,
      onDismiss: second.result.current.onDismiss,
    }));
    expect(screen.queryByText("Hoy comienza una nueva historia.")).not.toBeInTheDocument();
    expect(visibleEvents).toEqual([
      { kind: "flow_started" },
      { kind: "result_layer" },
      { kind: "delivery_pending" },
      { kind: "silence" },
    ]);
  });

  it("observes visible receipt expiry categorically and keeps it deduped", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: ENABLED_PREFERENCES });
    const storage = new MemoryStorage();
    const source = {
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      storage: storageDependency(storage),
    };
    const first = renderHook(() => useFirstVisibleExperience(source));
    await waitFor(() => expect(first.result.current.viewModel).not.toBeNull());
    expect(first.result.current.onVisible?.()).toBe(true);
    first.unmount();

    vi.setSystemTime(new Date("2026-10-05T15:00:00.000Z"));
    const events: Array<{ kind: string }> = [];
    const second = renderHook(() => useFirstVisibleExperience({ ...source, observer: (event) => events.push(event) }));
    await waitFor(() => expect(second.result.current.status).toBe("settled"));

    expect(second.result.current.viewModel).toBeNull();
    expect(events).toEqual([
      { kind: "flow_started" },
      { kind: "delivery_expired" },
      { kind: "result_layer" },
      { kind: "silence" },
    ]);
  });

  it("lets the real Companion frequency policy silence a recent distinct visible receipt", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(INSTANT));
    getPushPreferences.mockResolvedValue({ preferences: ENABLED_PREFERENCES });
    const storage = new MemoryStorage();
    const dependencies = storageDependency(storage);
    const scope = { userId: USER.id, tripId: TRIP.id };
    const pending = createPendingVisibleDeliveryReceipt({
      scope,
      actionId: "decision:other-recent-action",
      destination: "in_app",
      references: ["editorial_message", "memory_candidate"],
      dedupeKey: "other-recent-dedupe",
      priority: "normal",
      pendingAt: "2026-10-03T14:00:00.000Z",
      expiryBoundaries: ["2026-10-04T15:00:00.000Z"],
    });
    if (!pending) throw new Error("Expected pending frequency fixture");
    const visible = transitionVisibleDeliveryReceipt(pending, "visible", "2026-10-03T14:30:00.000Z");
    if (visible.status !== "transitioned") throw new Error("Expected visible frequency fixture");
    expect(writeVisibleDeliverySession({
      dependencies,
      scope,
      document: { version: 1, receipts: [visible.receipt] },
    })).toEqual({ status: "available" });
    const events: Array<{ kind: string }> = [];

    const { result } = renderHook(() => useFirstVisibleExperience({
      trip: TRIP,
      user: USER,
      storyPackage: demoStoryPackage,
      storyObservedAt: STORY_OBSERVED_AT,
      storage: dependencies,
      observer: (event) => events.push(event),
    }));
    await waitFor(() => expect(result.current.status).toBe("settled"));

    expect(result.current.viewModel).toBeNull();
    expect(events).toEqual([
      { kind: "flow_started" },
      { kind: "result_layer" },
      { kind: "silence" },
    ]);
    expect(JSON.parse(storage.getItem(buildVisibleDeliverySessionKey(scope)) ?? "{}").receipts)
      .toEqual([expect.objectContaining({ dedupeKey: "other-recent-dedupe", state: "visible" })]);
    expect(getPushPreferences).toHaveBeenCalledTimes(1);
  });
});
