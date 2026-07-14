import { createElement, type ReactNode } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sessionQueryKey } from "@/features/auth/hooks/useSession";
import type { User } from "@/features/auth/types";
import { CollectionItems } from "./ChapterSections";
import type { CollectionItem } from "@/features/story/engine/types";

const { fetchExchangeRates } = vi.hoisted(() => ({ fetchExchangeRates: vi.fn() }));
vi.mock("@/features/context-engine/exchangeRateClient", () => ({ fetchExchangeRates }));

afterEach(() => {
  vi.clearAllMocks();
});

function renderWithSession(items: CollectionItem[], user: Partial<User> | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(sessionQueryKey, { user });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return render(<CollectionItems items={items} chapterId="chapter-1" />, { wrapper });
}

const CHILEAN_USER: Partial<User> = { residenceCountryCode: "CL", preferredCurrency: null };

describe("CollectionItems — Money/Context Engine", () => {
  it("contenido legacy sin currency: muestra el precio como texto plano, sin conversión", () => {
    renderWithSession(
      [{ id: "sh-1", name: "Alfajores", suggestedWhereToBuy: "Havanna", estimatedPrice: "$8.000" }],
      CHILEAN_USER,
    );
    expect(screen.getByText("Havanna — $8.000")).toBeInTheDocument();
    expect(fetchExchangeRates).not.toHaveBeenCalled();
  });

  it("rango de precios ('Variable' o con guion): se muestra tal cual, no se intenta convertir", () => {
    renderWithSession(
      [
        {
          id: "sh-2",
          name: "Souvenir",
          suggestedWhereToBuy: "Feria",
          estimatedPrice: "$15.000–$25.000",
          currency: "ARS",
        },
      ],
      CHILEAN_USER,
    );
    expect(screen.getByText("Feria — $15.000–$25.000")).toBeInTheDocument();
    expect(fetchExchangeRates).not.toHaveBeenCalled();
  });

  it("contenido nuevo con currency + usuario en otro país: muestra local y, al resolver, la conversión", async () => {
    fetchExchangeRates.mockResolvedValueOnce({
      base: "ARS",
      date: "2026-07-14",
      rates: { CLP: 0.75 },
      source: "frankfurter",
      fetchedAt: "2026-07-14T12:00:00.000Z",
      stale: false,
    });

    renderWithSession(
      [{ id: "sh-3", name: "Alfajores", suggestedWhereToBuy: "Havanna", estimatedPrice: "$8.000", currency: "ARS" }],
      CHILEAN_USER,
    );

    expect(screen.getByText(/ARS/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Según el cambio de hoy\./)).toBeInTheDocument());
    expect(screen.getByText(/≈.*CLP/)).toBeInTheDocument();
  });

  it("tasa stale: muestra la copy de último cambio disponible", async () => {
    fetchExchangeRates.mockResolvedValueOnce({
      base: "ARS",
      date: "2026-07-10",
      rates: { CLP: 0.7 },
      source: "frankfurter",
      fetchedAt: "2026-07-10T12:00:00.000Z",
      stale: true,
    });

    renderWithSession(
      [{ id: "sh-4", name: "Chocolate", estimatedPrice: "10000", currency: "ARS" }],
      CHILEAN_USER,
    );

    await waitFor(() =>
      expect(screen.getByText(/Según el último cambio disponible\./)).toBeInTheDocument(),
    );
  });

  it("misma moneda local y preferida: no muestra conversión ni llama a la red", async () => {
    renderWithSession(
      [{ id: "sh-5", name: "Dulce de leche", estimatedPrice: "5000", currency: "CLP" }],
      CHILEAN_USER,
    );

    expect(screen.getByText(/CLP/)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchExchangeRates).not.toHaveBeenCalled();
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });

  it("sin sesión (usuario null): resuelve moneda preferida por fallback y no rompe", () => {
    renderWithSession(
      [{ id: "sh-6", name: "Mate", estimatedPrice: "$8.000", currency: "ARS" }],
      null,
    );
    expect(screen.getByText(/ARS/)).toBeInTheDocument();
  });
});
