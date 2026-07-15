import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import { useLivingContext, type UseLivingContextInput } from "./useLivingContext";

const { resolveFinancialRate } = vi.hoisted(() => ({ resolveFinancialRate: vi.fn() }));
vi.mock("./financialContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./financialContext")>()),
  resolveFinancialRate,
}));

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
  beforeEach(() => resolveFinancialRate.mockReset());

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
    resolveFinancialRate.mockResolvedValue({
      rate: 0.75, rateDate: "2026-07-15",
      freshness: "fresh", available: true, source: "frankfurter", fetchedAt: "2026-07-15T15:00:00Z",
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const useTwo = ({ tick }: { tick: number }) => {
      void tick;
      return [useLivingContext(baseInput), useLivingContext(baseInput)] as const;
    };
    const { result, rerender } = renderHook(useTwo, { initialProps: { tick: 0 }, wrapper: wrapper(client) });
    await waitFor(() => expect(result.current[0].financial.status).toBe("available"));
    expect(resolveFinancialRate).toHaveBeenCalledTimes(1);
    rerender({ tick: 1 });
    expect(resolveFinancialRate).toHaveBeenCalledTimes(1);

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
  it("entrega todos los datos disponibles y no bloquea por finanzas lentas", async () => {
    resolveFinancialRate.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return { available: true, rate: 0.75, rateDate: "2026-07-15", freshness: "fresh" as const, source: "frankfurter", fetchedAt: "2026-07-15T14:30:00Z" };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const input = { ...baseInput, story: { baseStoryId: "ba-2026", package: pkg } };
    const { result } = renderHook(() => useLivingContext(input), { wrapper: wrapper(client) });
    expect(result.current.destination.status).toBe("available");
    expect(result.current.temporal.status).toBe("available");
    expect(result.current.narrative.status).toBe("available");
    expect(result.current.financial).toMatchObject({ status: "unavailable", reason: "pending" });

    await waitFor(() => expect(result.current.capabilities).toEqual({ destination: true, temporal: true, financial: true, narrative: true, weather: false }));
    expect(resolveFinancialRate).toHaveBeenCalledTimes(1);
  });

  it("recalcula 1000→2000 con la misma tasa y un solo request", async () => {
    resolveFinancialRate.mockResolvedValue({ available: true, rate: 0.75, rateDate: "2026-07-15", freshness: "fresh", source: "frankfurter", fetchedAt: "2026-07-15T14:30:00Z" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(({ amount }) => useLivingContext({ ...baseInput, financial: { localMoney: { amount, currency: "ARS" } } }), {
      initialProps: { amount: 1000 }, wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.financial.value?.convertedMoney?.amount).toBe(750));
    rerender({ amount: 2000 });
    await waitFor(() => expect(result.current.financial.value?.convertedMoney?.amount).toBe(1500));
    expect(resolveFinancialRate).toHaveBeenCalledTimes(1);
  });

  it("actualiza fechas, destination, narrativa y provenance con identidad remota estable", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const noFinance: UseLivingContextInput = { ...baseInput, financial: null, story: { baseStoryId: "ba-2026", package: pkg }, observedAt: { trip: "2026-07-15T12:00:00Z", story: "2026-07-15T12:00:00Z" } };
    const { result, rerender } = renderHook(({ input }) => useLivingContext(input), { initialProps: { input: noFinance }, wrapper: wrapper(client) });
    const nextPackage = { ...pkg, storyMood: { primary: "reflective" }, baseCopy: { ...pkg.baseCopy, welcomeMessage: "Nuevo copy literal" } };
    const nextTrip = {
      ...trip,
      startDateTime: "2026-07-15", endDateTime: "2026-07-20",
      destination: { ...(trip.destination as Exclude<Trip["destination"], string>), cityName: "Córdoba", timezone: "America/Argentina/Cordoba" },
    };
    const visibleChapter = { id: "c2", order: 2, title: "Capítulo actual", status: "available" as const };
    rerender({ input: {
      ...noFinance, trip: nextTrip,
      story: { baseStoryId: "ba-2026", package: nextPackage, view: {
        currentMode: "in_progress", visibleChapter, lockedChapters: [], availableChapters: ["c2"], completedChapters: [], nextUnlock: null, specialChapterStatus: null, memoryModeAvailable: false,
      } },
      observedAt: { trip: "2026-07-15T14:59:00Z", story: "2026-07-15T14:58:00Z" },
    } });
    expect(result.current.destination.value?.city).toBe("Córdoba");
    expect(result.current.temporal.value?.startDateTime).toBe("2026-07-15");
    expect(result.current.narrative.value?.baseCopy.welcomeMessage).toBe("Nuevo copy literal");
    expect(result.current.narrative.value?.currentChapter?.id).toBe("c2");
    expect(result.current.destination.provenance.observedAt).toBe("2026-07-15T14:59:00Z");
    expect(resolveFinancialRate).not.toHaveBeenCalled();
  });

  it("envejece finanzas con el reloj del hook aunque la tasa diga fresh", async () => {
    resolveFinancialRate.mockResolvedValue({ available: true, rate: 0.75, rateDate: "2026-07-10", freshness: "fresh", source: "frankfurter", fetchedAt: "2026-07-10T12:00:00Z" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useLivingContext(baseInput), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.financial.status).toBe("available"));
    expect(result.current.financial.freshness).toBe("stale");
  });
});
