import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import realStory from "@/content/stories/buenos-aires-2026/story.json";
import { collectAdaptiveJourneyActivities, useAdaptiveJourney } from "./useAdaptiveJourney";

const { resolveFinancialRate, fetchWeatherContext } = vi.hoisted(() => ({
  resolveFinancialRate: vi.fn(),
  fetchWeatherContext: vi.fn(),
}));
vi.mock("@/features/context-engine/financialContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/context-engine/financialContext")>()),
  resolveFinancialRate,
}));
vi.mock("@/features/context-engine/weatherContextClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/context-engine/weatherContextClient")>()),
  fetchWeatherContext,
}));

const NOW = "2026-07-19T18:30:00.000Z";
const trip: Trip = {
  id: "trip-adaptive", title: "Viaje", baseStoryId: "story-ba-2026", status: "active", role: "owner",
  updatedAt: NOW, startDateTime: "2026-07-18", endDateTime: "2026-07-21",
  destination: {
    countryCode: "AR", countryName: "Argentina", cityId: "ba", cityName: "Buenos Aires",
    latitude: -34.6037, longitude: -58.3816, timezone: "America/Argentina/Buenos_Aires",
  },
};
const user: User = {
  id: "user-adaptive", email: "safe@example.com", displayName: null,
  residenceCountryCode: "CL", preferredCurrency: "CLP", emailVerifiedAt: NOW, onboardingCompleted: true,
};
const storyPackage = realStory as StoryPackage;

function source(overrides: Partial<Parameters<typeof useAdaptiveJourney>[0]> = {}) {
  return {
    trip,
    user,
    storyPackage,
    storyObservedAt: NOW,
    financial: { localMoney: { amount: 1000, currency: "ARS" } },
    ...overrides,
  };
}

function wrapper(client: QueryClient) {
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function weatherSnapshot() {
  return {
    value: {
      condition: "rain", temperatureC: 16, precipitationProbability: 80,
      isRaining: true, isStorm: false, isSnow: false,
      sunrise: { localDateTime: "2026-07-19T07:50", timezone: "America/Argentina/Buenos_Aires" },
      sunset: { localDateTime: "2026-07-19T18:05", timezone: "America/Argentina/Buenos_Aires" },
      effectiveAt: { localDateTime: "2026-07-19T15:30", timezone: "America/Argentina/Buenos_Aires" },
      expiresAt: "2026-07-19T18:45:00.000Z", confidence: "unknown",
    },
    fetchedAt: NOW,
    source: "weather",
  };
}

describe("useAdaptiveJourney", () => {
  beforeEach(() => {
    resolveFinancialRate.mockReset();
    fetchWeatherContext.mockReset();
  });

  it("prepara los seis candidatos Story vigentes sin copy privado", () => {
    const candidates = collectAdaptiveJourneyActivities(storyPackage);

    expect(candidates.map(({ activityId }) => activityId)).toEqual([
      "act-1-3",
      "act-1-drone-obelisco",
      "act-2-2",
      "act-2-6",
      "act-2-8",
      "act-3-5",
    ]);
    expect(JSON.stringify(candidates)).not.toMatch(/Obelisco|Floralis|Rosedal|Puerto Madero|Caminito|description|title/);
    expect(Object.isFrozen(candidates)).toBe(true);
  });

  it("mantiene un instante por scope y lo renueva solo al cambiar usuario-viaje-story", () => {
    fetchWeatherContext.mockResolvedValue(weatherSnapshot());
    resolveFinancialRate.mockRejectedValue(new Error("financial unavailable"));
    const clock = vi.fn()
      .mockReturnValueOnce(new Date(NOW))
      .mockReturnValueOnce(new Date("2026-07-19T18:31:00.000Z"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(({ current }) => useAdaptiveJourney(current, { now: clock }), {
      initialProps: { current: source() }, wrapper: wrapper(client),
    });

    const first = result.current.logicalInstant;
    rerender({ current: source() });
    expect(result.current.logicalInstant).toBe(first);
    expect(clock).toHaveBeenCalledTimes(1);

    rerender({ current: source({ trip: { ...trip, id: "trip-adaptive-2" } }) });
    expect(result.current.logicalInstant).toBe("2026-07-19T18:31:00.000Z");
    expect(clock).toHaveBeenCalledTimes(2);
  });

  it("comparte Weather entre consumidores y aisla un fallo Financial", async () => {
    fetchWeatherContext.mockResolvedValue(weatherSnapshot());
    resolveFinancialRate.mockRejectedValue(new Error("financial secret"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const clock = () => new Date(NOW);
    const { result } = renderHook(() => [
      useAdaptiveJourney(source(), { now: clock }),
      useAdaptiveJourney(source(), { now: clock }),
    ] as const, { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current[0].livingContext.weather.status).toBe("available"));
    await waitFor(() => expect(result.current[0].livingContext.financial.reason).toBe("financial_failed"));
    expect(result.current[1].livingContext.weather.status).toBe("available");
    expect(result.current[0].livingContext.temporal.status).toBe("available");
    expect(fetchWeatherContext).toHaveBeenCalledTimes(1);
    expect(resolveFinancialRate).toHaveBeenCalledTimes(1);
  });

  it("mantiene Temporal y Story cuando Weather falla", async () => {
    fetchWeatherContext.mockResolvedValue(null);
    resolveFinancialRate.mockResolvedValue({ available: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAdaptiveJourney(source(), { now: () => new Date(NOW) }), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.livingContext.weather.reason).toBe("weather_failed"));
    expect(result.current.livingContext.temporal.status).toBe("available");
    expect(result.current.livingContext.narrative.status).toBe("available");
    expect(result.current.activities).toHaveLength(6);
  });
});
