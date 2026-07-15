import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import { useLivingContext, type UseLivingContextInput } from "./useLivingContext";

const { resolveFinancialContext } = vi.hoisted(() => ({ resolveFinancialContext: vi.fn() }));
vi.mock("./financialContext", () => ({ resolveFinancialContext }));

const trip: Trip = {
  id: "trip-1", title: "Viaje", baseStoryId: "ba-2026", status: "active", role: "owner",
  updatedAt: "2026-07-15T12:00:00Z", startDateTime: "2026-07-16", endDateTime: "2026-07-18",
  destination: { countryCode: "AR", countryName: "Argentina", cityId: "ba", cityName: "Buenos Aires", latitude: -34, longitude: -58, timezone: "America/Argentina/Buenos_Aires" },
};
const pkg: StoryPackage = {
  storyId: "story-ba-2026", schemaVersion: "1.4",
  metadata: { destination: "Buenos Aires", title: "Story", travelDates: { start: "2026-07-16", end: "2026-07-18" }, language: "es", destinationCountryCode: "AR", destinationLanguage: "es" },
  storyMood: { primary: "warm" }, unlockRulesDefault: {}, chapters: [],
  baseCopy: { welcomeMessage: "Hola literal", dailyOpenTemplate: "Abrir", dailyCloseTemplate: "Cerrar" },
};
const baseInput: UseLivingContextInput = {
  trip, user: { preferredCurrency: "CLP", residenceCountryCode: "CL" },
  story: null, financial: { localMoney: { amount: 1000, currency: "ARS" } },
  now: new Date("2026-07-15T15:00:00Z"),
};

function wrapper(client: QueryClient) {
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLivingContext", () => {
  beforeEach(() => resolveFinancialContext.mockReset());

  it("entrega base inmediata y suma Story en un render sucesivo", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const noFinance = { ...baseInput, financial: null };
    const { result, rerender } = renderHook(({ input }) => useLivingContext(input), { initialProps: { input: noFinance }, wrapper: wrapper(client) });
    expect(result.current.destination.status).toBe("available");
    expect(result.current.financial.reason).toBe("missing_financial_input");
    expect(result.current.narrative.reason).toBe("missing_story");

    rerender({ input: { ...noFinance, story: { baseStoryId: "ba-2026", package: pkg } } });
    expect(result.current.narrative.value?.storyId).toBe("story-ba-2026");
  });

  it("dos consumidores comparten un request y un rerender estable no inicia otro", async () => {
    resolveFinancialContext.mockResolvedValue({
      localMoney: { amount: 1000, currency: "ARS" }, convertedMoney: { amount: 750, currency: "CLP" }, rateDate: "2026-07-15",
      freshness: "fresh", available: true, source: "provider", fetchedAt: "2026-07-15T15:00:00Z",
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const useTwo = ({ tick }: { tick: number }) => {
      void tick;
      return [useLivingContext(baseInput), useLivingContext(baseInput)] as const;
    };
    const { result, rerender } = renderHook(useTwo, { initialProps: { tick: 0 }, wrapper: wrapper(client) });
    await waitFor(() => expect(result.current[0].financial.status).toBe("available"));
    expect(resolveFinancialContext).toHaveBeenCalledTimes(1);
    rerender({ tick: 1 });
    expect(resolveFinancialContext).toHaveBeenCalledTimes(1);

    expect(result.current[1].financial.status).toBe("available");
  });

  it("un cambio de Trip publica la nueva identidad sin invalidar cache ajena", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["unrelated"], "keep");
    const noFinance = { ...baseInput, financial: null };
    const { result, rerender } = renderHook(({ input }) => useLivingContext(input), { initialProps: { input: noFinance }, wrapper: wrapper(client) });
    rerender({ input: { ...noFinance, trip: { ...trip, id: "trip-2", destination: { ...(trip.destination as object), cityName: "Córdoba" } as Trip["destination"] } } });
    expect(result.current.destination.value?.city).toBe("Córdoba");
    expect(client.getQueryData(["unrelated"])).toBe("keep");
  });
});
