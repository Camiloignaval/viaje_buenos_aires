import { platformRequest } from "@/services/platformClient";
import type { ExchangeRateSnapshot } from "./types";

// Único punto de contacto con el proveedor de tasas — siempre a través del
// backend de Alaia, nunca directo a un tercero desde React (sección 7/8 del
// alcance). Si la llamada falla por cualquier motivo (red, timeout, 5xx), se
// devuelve `null`: el Context Engine nunca debe romper la Experience por una
// falla de un servicio externo.
export async function fetchExchangeRates({
  base,
  symbols,
  signal,
}: {
  base: string;
  symbols: string[];
  signal?: AbortSignal;
}): Promise<ExchangeRateSnapshot | null> {
  if (symbols.length === 0) return null;
  const query = new URLSearchParams({ base, symbols: symbols.join(",") });
  try {
    return await platformRequest<ExchangeRateSnapshot>(
      `/api/context/exchange-rates?${query.toString()}`,
      { signal },
    );
  } catch {
    return null;
  }
}
