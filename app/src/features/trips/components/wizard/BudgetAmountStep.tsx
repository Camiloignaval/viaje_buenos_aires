import { WizardShell } from "@/components/wizard/WizardShell";
import { CURRENCY_OPTIONS } from "../../data/travelOptions";

interface Props {
  amount: number | null;
  currency: string;
  onChangeAmount: (value: number | null) => void;
  onChangeCurrency: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

// Pantalla adicional, solo si eligieron "Definir un presupuesto" en el paso
// anterior. Monto TOTAL del viaje — no por persona, no por día.
export function BudgetAmountStep({
  amount,
  currency,
  onChangeAmount,
  onChangeCurrency,
  onBack,
  onNext,
  canAdvance,
}: Props) {
  return (
    <WizardShell
      question="¿Cuánto les gustaría destinar para todo este viaje?"
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!canAdvance}
    >
      <p className="combobox-helper">Para todo el viaje, no por persona ni por día.</p>

      <label htmlFor="wizard-budget-currency">Moneda</label>
      <select
        id="wizard-budget-currency"
        value={currency}
        onChange={(event) => onChangeCurrency(event.target.value)}
      >
        <option value="" disabled>
          Elige una moneda
        </option>
        {CURRENCY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label htmlFor="wizard-budget-amount">Monto aproximado</label>
      <input
        id="wizard-budget-amount"
        type="number"
        inputMode="decimal"
        min={0}
        step="1"
        autoFocus
        value={amount ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          onChangeAmount(raw === "" ? null : Number(raw));
        }}
      />
    </WizardShell>
  );
}
