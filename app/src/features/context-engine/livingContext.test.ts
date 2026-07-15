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
      "missing_weather_input",
      "weather_outside_window",
      "weather_pending",
      "weather_failed",
      "weather_refresh_failed",
    ]);
    expect(LIVING_CONTEXT_FRESHNESS_MS).toEqual({
      destination: 86_400_000,
      temporal: 60_000,
      financial: 3_600_000,
      narrative: 86_400_000,
      weather: 900_000,
    });
  });

  it("incorpora Weather como quinto módulo dentro del resolver existente", async () => {
    const weatherAdapter = vi.fn(async () => ({
      value: {
        condition: "clear" as const, temperatureC: 22, precipitationProbability: 5,
        isRaining: false, isStorm: false, isSnow: false, sunrise: null, sunset: null,
        effectiveAt: { localDateTime: "2026-10-03T12:00", timezone: "America/Argentina/Buenos_Aires" },
        expiresAt: "2026-10-03T15:15:00.000Z", confidence: "unknown" as const,
      },
      fetchedAt: "2026-10-03T15:00:00.000Z", source: "open-meteo",
    }));
    const resolution = createLivingContextResolution({
      trip: trip(), story: { baseStoryId: "ba-2026", package: storyPackage() },
      user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      financial: { localMoney: { amount: 1000, currency: "ARS" } },
    }, {
      now: () => now,
      financialAdapter: async () => ({
        localMoney: { amount: 1000, currency: "ARS" }, convertedMoney: { amount: 750, currency: "CLP" },
        rateDate: "2026-10-03", freshness: "fresh", available: true,
        source: "frankfurter", fetchedAt: "2026-10-03T14:30:00.000Z",
      }),
      weatherAdapter,
    });

    expect(resolution.initial.weather).toMatchObject({ status: "unavailable", reason: "weather_pending" });
    const settled = await resolution.settled;
    expect(settled.capabilities).toEqual({ destination: true, temporal: true, financial: true, narrative: true, weather: true });
    expect([settled.destination, settled.temporal, settled.financial, settled.narrative, settled.weather].map((item) => item.status)).toEqual([
      "available", "available", "available", "available", "available",
    ]);
    expect(weatherAdapter).toHaveBeenCalledWith({
      latitude: -34.6037, longitude: -58.3816, timezone: "America/Argentina/Buenos_Aires", localDate: "2026-10-03", signal: undefined,
    });
  });

  it("aísla fallas Weather y financieras sin perder módulos elegibles", async () => {
    const observer = vi.fn();
    const settled = await createLivingContextResolution({
      trip: trip(), story: { baseStoryId: "ba-2026", package: storyPackage() },
      user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      financial: { localMoney: { amount: 1000, currency: "ARS" } },
    }, {
      now: () => now, observer,
      financialAdapter: async () => { throw new Error("financial secret"); },
      weatherAdapter: async () => { throw new Error("kari@example.com -34.6037 token=secret provider-json"); },
    }).settled;

    expect(settled.destination.status).toBe("available");
    expect(settled.temporal.status).toBe("available");
    expect(settled.narrative.status).toBe("available");
    expect(settled.financial).toMatchObject({ status: "unavailable", reason: "financial_failed" });
    expect(settled.weather).toMatchObject({ status: "unavailable", reason: "weather_failed" });
    expect(settled.capabilities.weather).toBe(false);
    const weatherEvent = observer.mock.calls.map(([event]) => event).find((event) => event.module === "weather");
    expect(weatherEvent).toMatchObject({ module: "weather", status: "unavailable", reason: "weather_failed", source: "weather.adapter" });
    expect(JSON.stringify(observer.mock.calls)).not.toMatch(/kari|34\.6037|secret|provider-json/i);
  });

  it("conserva Foundation completa cuando solo Weather falla", async () => {
    const observer = vi.fn();
    const resolution = createLivingContextResolution({
      trip: trip(), story: { baseStoryId: "ba-2026", package: storyPackage() },
      user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      financial: { localMoney: { amount: 1000, currency: "ARS" } },
    }, {
      now: () => now,
      observer,
      financialAdapter: async () => ({
        localMoney: { amount: 1000, currency: "ARS" }, convertedMoney: { amount: 750, currency: "CLP" },
        rateDate: "2026-10-03", freshness: "fresh", available: true,
        source: "frankfurter", fetchedAt: "2026-10-03T14:30:00.000Z",
      }),
      weatherAdapter: async () => {
        throw new Error("kari@example.com -34.6037 token=secret provider-json");
      },
    });

    expect(resolution.initial.financial).toMatchObject({ status: "unavailable", reason: "pending" });
    expect(resolution.initial.weather).toMatchObject({ status: "unavailable", reason: "weather_pending" });
    expect([resolution.initial.destination, resolution.initial.temporal, resolution.initial.narrative].map((item) => item.status)).toEqual([
      "available", "available", "available",
    ]);

    const settled = await resolution.settled;
    expect([settled.destination, settled.temporal, settled.financial, settled.narrative].map((item) => item.status)).toEqual([
      "available", "available", "available", "available",
    ]);
    expect(settled.weather).toMatchObject({
      status: "unavailable", reason: "weather_failed", freshness: "unavailable",
      provenance: { source: "weather.adapter" },
    });
    expect(settled.capabilities).toEqual({ destination: true, temporal: true, financial: true, narrative: true, weather: false });
    const weatherEvent = observer.mock.calls.map(([event]) => event).find((event) => event.module === "weather");
    expect(weatherEvent).toMatchObject({ module: "weather", status: "unavailable", reason: "weather_failed", source: "weather.adapter" });
    expect(JSON.stringify(observer.mock.calls)).not.toMatch(/kari|34\.6037|secret|provider-json/i);
  });

  it("conserva Weather y Foundation no financiera cuando solo finanzas falla", async () => {
    const observer = vi.fn();
    const settled = await createLivingContextResolution({
      trip: trip(), story: { baseStoryId: "ba-2026", package: storyPackage() },
      user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      financial: { localMoney: { amount: 1000, currency: "ARS" } },
    }, {
      now: () => now,
      observer,
      financialAdapter: async () => {
        throw new Error("email=kari@example.com budget=1000 token=secret");
      },
      weatherAdapter: async () => ({
        value: {
          condition: "rain" as const, temperatureC: 16, precipitationProbability: 85,
          isRaining: true, isStorm: false, isSnow: false, sunrise: null, sunset: null,
          effectiveAt: { localDateTime: "2026-10-03T12:00", timezone: "America/Argentina/Buenos_Aires" },
          expiresAt: "2026-10-03T15:15:00.000Z", confidence: "unknown" as const,
        },
        fetchedAt: "2026-10-03T15:00:00.000Z", source: "open-meteo",
      }),
    }).settled;

    expect(settled.financial).toMatchObject({ status: "unavailable", reason: "financial_failed", freshness: "unavailable" });
    expect([settled.destination, settled.temporal, settled.narrative].map((item) => item.status)).toEqual([
      "available", "available", "available",
    ]);
    expect(settled.weather).toMatchObject({
      status: "available", freshness: "fresh",
      value: { condition: "rain", temperatureC: 16, precipitationProbability: 85, isRaining: true },
      provenance: { source: "weather.provider", observedAt: "2026-10-03T15:00:00.000Z" },
    });
    expect(settled.capabilities).toEqual({ destination: true, temporal: true, financial: false, narrative: true, weather: true });
    const financeEvent = observer.mock.calls.map(([event]) => event).find((event) => event.module === "financial");
    expect(financeEvent).toMatchObject({ module: "financial", status: "unavailable", reason: "financial_failed", source: "financial.adapter" });
    expect(JSON.stringify(observer.mock.calls)).not.toMatch(/kari|budget|1000|secret/i);
  });

  it("fuera de ventana o sin dependencia no llama Weather y explica indisponibilidad", async () => {
    const weatherAdapter = vi.fn();
    const outside = await createLivingContextResolution({
      trip: { ...trip(), startDateTime: "2026-10-05", endDateTime: "2026-10-06" },
    }, { now: () => now, weatherAdapter }).settled;
    expect(outside.weather).toMatchObject({ status: "unavailable", reason: "weather_outside_window", provenance: { source: "weather.adapter" } });
    expect(weatherAdapter).not.toHaveBeenCalled();

    const missingProvider = await createLivingContextResolution({ trip: trip() }, { now: () => now }).settled;
    expect(missingProvider.weather).toMatchObject({ status: "unavailable", reason: "missing_weather_input" });
    expect(missingProvider.destination.status).toBe("available");
  });

  it("descarta un snapshot Weather runtime inválido sin afectar Foundation", async () => {
    const settled = await createLivingContextResolution({ trip: trip() }, {
      now: () => now,
      weatherAdapter: async () => ({ value: { condition: "clear" }, source: "raw -34.6037", fetchedAt: "bad" }) as never,
    }).settled;

    expect(settled.weather).toMatchObject({ status: "unavailable", reason: "weather_failed", freshness: "unavailable" });
    expect(settled.destination.status).toBe("available");
    expect(settled.temporal.status).toBe("available");
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
    expect(settled.capabilities).toEqual({ destination: true, temporal: true, financial: false, narrative: true, weather: false });
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
    expect((await resolution.settled).capabilities).toEqual({ destination: true, temporal: false, financial: false, narrative: false, weather: false });
  });
  it("resuelve los cuatro módulos disponibles en el snapshot settled", async () => {
    const resolution = createLivingContextResolution({
      trip: trip(), story: { baseStoryId: "ba-2026", package: storyPackage() },
      user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      financial: { localMoney: { amount: 1000, currency: "ARS" } },
    }, {
      now: () => now,
      financialAdapter: async () => ({
        localMoney: { amount: 1000, currency: "ARS" }, convertedMoney: { amount: 750, currency: "CLP" },
        rateDate: "2026-10-03", freshness: "fresh", available: true,
        source: "frankfurter", fetchedAt: "2026-10-03T14:30:00.000Z",
      }),
    });
    const settled = await resolution.settled;
    expect(settled.capabilities).toEqual({ destination: true, temporal: true, financial: true, narrative: true, weather: false });
    expect([settled.destination, settled.temporal, settled.financial, settled.narrative].map((item) => item.status)).toEqual([
      "available", "available", "available", "available",
    ]);
  });

  it("marca stale según el reloj aunque el adapter financiero declare fresh", async () => {
    const settled = await createLivingContextResolution({
      trip: { ...trip(), updatedAt: "2026-10-01T12:00:00.000Z" },
      story: { baseStoryId: "ba-2026", package: storyPackage() },
      user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      financial: { localMoney: { amount: 1000, currency: "ARS" } },
      observedAt: { story: "2026-10-01T12:00:00.000Z" },
    }, {
      now: () => now,
      financialAdapter: async () => ({
        localMoney: { amount: 1000, currency: "ARS" }, convertedMoney: { amount: 750, currency: "CLP" },
        rateDate: "2026-10-01", freshness: "fresh", available: true,
        source: "frankfurter", fetchedAt: "2026-10-01T12:00:00.000Z",
      }),
    }).settled;
    expect(settled.destination.freshness).toBe("stale");
    expect(settled.narrative.freshness).toBe("stale");
    expect(settled.financial.freshness).toBe("stale");
  });

  it("ignora capabilities futuras sin adapter ni request implícito", async () => {
    const futureAdapter = vi.fn();
    const input = { trip: trip(), weather: { adapter: futureAdapter } } as Parameters<typeof createLivingContextResolution>[0];
    const settled = await createLivingContextResolution(input, { now: () => now }).settled;
    expect(settled.capabilities).toEqual({ destination: true, temporal: true, financial: false, narrative: false, weather: false });
    expect(Object.keys(settled.capabilities)).toEqual(["destination", "temporal", "financial", "narrative", "weather"]);
    expect(futureAdapter).not.toHaveBeenCalled();
  });

  it("categoriza source financiero sensible y usa timing inyectado determinista", async () => {
    const observer = vi.fn();
    const ticks = [100, 145];
    await createLivingContextResolution({
      trip: trip(), user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
      financial: { localMoney: { amount: 1000, currency: "ARS" } },
    }, {
      now: () => now,
      timingNow: () => ticks.shift() ?? 145,
      observer,
      financialAdapter: async () => ({
        localMoney: { amount: 1000, currency: "ARS" }, convertedMoney: { amount: 750, currency: "CLP" },
        rateDate: "2026-10-03", freshness: "fresh", available: true,
        source: "kari@example.com token=secret -34.6037,-58.3816", fetchedAt: "2026-10-03T14:30:00.000Z",
      }),
    }).settled;
    const financeEvent = observer.mock.calls.map(([event]) => event).find((event) => event.module === "financial");
    expect(financeEvent).toEqual({ module: "financial", status: "available", reason: null, source: "financial.adapter", durationMs: 45 });
    expect(JSON.stringify(observer.mock.calls)).not.toMatch(/kari|secret|34\.6037|58\.3816/);
  });
});
