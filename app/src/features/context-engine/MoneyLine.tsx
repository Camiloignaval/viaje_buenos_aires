import { useFinancialContext } from "./useFinancialContext";
import { formatLocalMoney, formatConvertedMoney, FRESHNESS_COPY } from "./currencyFormatter";
import type { Money } from "./types";

// Jerarquía editorial obligatoria (sección 13 del alcance): local siempre
// primero y protagonista; conversión discreta debajo; referencia temporal al
// final, solo si hay conversión. Nunca se muestra copy de fallback si no la
// hay — la ausencia de conversión es silenciosa, no un hueco ni un error.
export function MoneyLine({
  localMoney,
  preferredCurrency,
}: {
  localMoney: Money;
  preferredCurrency: string;
}) {
  const { data } = useFinancialContext(localMoney, preferredCurrency);
  const showConversion = Boolean(data?.available && data.convertedMoney);

  return (
    <span className="money-line">
      <span className="money-line-local">{formatLocalMoney(localMoney)}</span>
      {showConversion && data?.convertedMoney ? (
        <span className="money-line-context">
          <span className="money-line-converted">{formatConvertedMoney(data.convertedMoney)}</span>
          {FRESHNESS_COPY[data.freshness] ? (
            <span className="money-line-freshness">{FRESHNESS_COPY[data.freshness]}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
