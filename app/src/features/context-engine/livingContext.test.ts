import { describe, expect, it, vi } from "vitest";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import {
  LIVING_CONTEXT_FRESHNESS_MS,
  LIVING_CONTEXT_REASONS,
  createLivingContextResolution,
} from "./livingContext";

const now = new Date("2026-10-03T15:00:00.000Z");

function trip(): Trip {
  return {
    id: "trip-private",
    title: "Viaje de Kari",
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
    updatedAt: "2026-10-03T14:30:00.000Z",
    startDateTime: "2026-10-03",
    endDateTime: "2026-10-06",
  };
}

function storyPackage(): StoryPackage {
  return {
    storyId: "story-ba-2026",
    schemaVersion: "1.4",
    metadata: {
      destination: "Montevideo, Uruguay",
      destinationCountryCode: "UY",
      destinationLanguage: "es",
      title: "Buenos Aires literal",
      travelDates: { start: "2030-01-01", end: "2030-01-04" },
      language: "es",
    },
    storyMood: { primary: "íntima" },
    unlockRulesDefault: {},
    chapters: [{ id: "c1", order: 1, title: "Llegada", copy: { open: "Copy curado literal" } }],
    baseCopy: {
      welcomeMessage: "Bienvenida literal",
      dailyOpenTemplate: "Abrir literal",
      dailyCloseTemplate: "Cerrar literal",
    },
  };
}

describe("createLivingContextResolution", () => {
  it("expone un catálogo cerrado de razones y umbrales contractuales", () => {
    expect(LIVING_CONTEXT_REASONS).toEqual([
      "missing_destination",
      "missing_dates",
      "invalid_timezone",
      "missing_financial_input",
      "pending",
      "financial_failed",
      "missing_story",
      "story_mismatch",
    ]);
    expect(LIVING_CONTEXT_FRESHNESS_MS).toEqual({
      destination: 86_400_000,
      temporal: 60_000,
      financial: 3_600_000,
      narrative: 86_400_000,
    });
  });

  it("mantiene precedencia Trip/Story, ids literales y no muta inputs", async () => {
    const input = {
      trip: trip(),
      story: { baseStoryId: "ba-2026", package: storyPackage() },
      observedAt: { story: "2026-10-03T14:45:00.000Z" },
    };
    const original = structuredClone(input);

    const result = createLivingContextResolution(input, { now: () => now });

    expect(result.initial.destination.value).toMatchObject({ city: "Buenos Aires", timezone: "America/Argentina/Buenos_Aires" });
    expect(result.initial.temporal.value?.startDateTime).toBe("2026-10-03");
    expect(result.initial.narrative.value).toMatchObject({
      baseStoryId: "ba-2026",
      storyId: "story-ba-2026",
      baseCopy: { welcomeMessage: "Bienvenida literal" },
    });
    expect(input).toEqual(original);
    expect(await result.settled).toEqual(result.initial);
  });

  it("publica initial sin esperar finanzas y aísla una falla del adapter", async () => {
    let rejectFinance!: (reason: Error) => void;
    const pending = new Promise<never>((_, reject) => { rejectFinance = reject; });
    const observer = vi.fn();
    const resolution = createLivingContextResolution({
      trip: trip(),
      story: { baseStoryId: "ba-2026", package: storyPackage() },
      user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      financial: { localMoney: { amount: 1000, currency: "ARS" } },
    }, {
      now: () => now,
      financialAdapter: () => pending,
      observer,
    });

    expect(resolution.initial.financial).toMatchObject({ status: "unavailable", reason: "pending" });
    expect(resolution.initial.destination.status).toBe("available");

    rejectFinance(new Error("email=kari@example.com coords=-34.60,-58.38 token=secret"));
    const settled = await resolution.settled;
    expect(settled.financial).toMatchObject({ status: "unavailable", reason: "financial_failed" });
    expect(settled.destination).toEqual(resolution.initial.destination);
    expect(settled.capabilities).toEqual({ destination: true, temporal: true, financial: false, narrative: true });
    expect(JSON.stringify(observer.mock.calls)).not.toMatch(/kari|34\.60|58\.38|secret|trip-private/i);
  });

  it("degrada cada módulo por separado con inputs mínimos", async () => {
    const resolution = createLivingContextResolution({
      trip: { ...trip(), startDateTime: undefined, endDateTime: undefined, baseStoryId: null },
    }, { now: () => now });
    expect(resolution.initial.destination.status).toBe("available");
    expect(resolution.initial.temporal).toMatchObject({ status: "unavailable", reason: "missing_dates" });
    expect(resolution.initial.narrative).toMatchObject({ status: "unavailable", reason: "missing_story" });
    expect(resolution.initial.financial).toMatchObject({ status: "unavailable", reason: "missing_financial_input" });
    expect((await resolution.settled).capabilities).toEqual({ destination: true, temporal: false, financial: false, narrative: false });
  });
});
