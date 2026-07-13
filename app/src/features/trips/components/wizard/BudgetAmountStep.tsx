import { WizardShell } from "@/components/wizard/WizardShell";
import { SelectField } from "@/components/inputs/SelectField";
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

      <SelectField
        id="wizard-budget-currency"
        className="trip-select-field"
        label="Moneda"
        value={currency}
        options={CURRENCY_OPTIONS}
        placeholder="Elige una moneda"
        onChange={onChangeCurrency}
      />

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
