import { describeDuration, firstDayHint, lastDayHint } from "../../lib/duration";
import { formatHumanDateTime } from "../../lib/dateFormat";
import { buildStorySentence } from "../../lib/storySentence";
import { companionLabel, reasonLabel, styleLabels, budgetStyleLabel } from "../../data/travelOptions";
import { WizardShell } from "@/components/wizard/WizardShell";
import type { WizardData, WizardStep } from "./wizardData";

interface Props {
  data: WizardData;
  onEditStep: (step: WizardStep) => void;
  onBack: () => void;
  onBegin: () => void;
  submitError?: string | null;
}

const ACCOMMODATION_LABELS: Record<string, string> = {
  hotel: "Hotel",
  address: "Dirección",
  neighborhood: "Barrio",
};

function travelersText(count: number | null): string {
  if (count == null) return "—";
  return `${count} ${count === 1 ? "persona" : "personas"}`;
}

// "Creo que ya empiezo a conocer esta historia" — no es una confirmación ni
// un listado de campos, es una portada: el mismo lenguaje editorial que
// Experience (mucho aire, sin cajas ni etiquetas en mayúscula). Cada dato
// sigue siendo editable con un click — solo que ahora se lee como prosa, no
// como filas de formulario. `aria-label` conserva el contexto ("Editar
// destino...") para lectores de pantalla, aunque visualmente no haya label.
export function SummaryStep({ data, onEditStep, onBack, onBegin, submitError }: Props) {
  const duration =
    data.startDateTime && data.endDateTime ? describeDuration(data.startDateTime, data.endDateTime) : null;
  const firstHint = data.startDateTime ? firstDayHint(data.startDateTime) : null;
  const lastHint = data.endDateTime ? lastDayHint(data.endDateTime) : null;
  const hasAccommodation = Boolean(data.accommodation && data.accommodation.type !== "unknown");
  const sentence = buildStorySentence({
    travelReason: data.travelReason,
    travelCompanions: data.travelCompanions,
    travelStyle: data.travelStyle,
    travelBudgetStyle: data.travelBudgetStyle,
  });

  const placeText = `${data.city?.name ?? ""}${data.city?.adminName ? `, ${data.city.adminName}` : ""}${
    data.country ? `, ${data.country.name}` : ""
  }`;
  const datesText =
    data.startDateTime && data.endDateTime
      ? `${formatHumanDateTime(data.startDateTime)} → ${formatHumanDateTime(data.endDateTime)}${
          duration ? ` · ${duration}` : ""
        }`
      : "—";
  const travelers = travelersText(data.expectedTravelers);
  const companions = companionLabel(data.travelCompanions ?? undefined) ?? "—";
  const reason = reasonLabel(data.travelReason ?? undefined) ?? "—";
  const style = styleLabels(data.travelStyle).join(" · ") || "—";
  const budgetStyle = budgetStyleLabel(data.travelBudgetStyle ?? undefined) ?? "—";
  const accommodationNote = hasAccommodation
    ? `Empiezan cada día en ${data.accommodation?.name ?? ACCOMMODATION_LABELS[data.accommodation?.type ?? "unknown"]}`
    : "Todavía no eligieron dónde empezará cada día";

  return (
    <WizardShell
      question="Creo que ya empiezo a conocer esta historia."
      onBack={onBack}
      onNext={onBegin}
      nextLabel="Comenzar esta historia →"
    >
      <div className="story-cover">
        <button
          type="button"
          className="story-cover-place"
          aria-label={`Editar destino, actualmente ${placeText}`}
          onClick={() => onEditStep("city")}
        >
          {placeText}
        </button>
        <button
          type="button"
          className="story-cover-dates"
          aria-label={`Editar fechas, actualmente ${datesText}`}
          onClick={() => onEditStep("arrival")}
        >
          {datesText}
        </button>
        {(firstHint || lastHint) && (
          <p className="story-cover-hint">
            {firstHint && <span>{firstHint}</span>}
            {lastHint && <span>{lastHint}</span>}
          </p>
        )}

        <p className="story-cover-tags">
          <button
            type="button"
            aria-label={`Editar cantidad de personas, actualmente ${travelers}`}
            onClick={() => onEditStep("travelers")}
          >
            {travelers}
          </button>
          <span aria-hidden="true"> · </span>
          <button type="button" aria-label={`Editar compañía, actualmente ${companions}`} onClick={() => onEditStep("companions")}>
            {companions}
          </button>
          <span aria-hidden="true"> · </span>
          <button type="button" aria-label={`Editar motivo, actualmente ${reason}`} onClick={() => onEditStep("reason")}>
            {reason}
          </button>
          <span aria-hidden="true"> · </span>
          <button type="button" aria-label={`Editar estilo, actualmente ${style}`} onClick={() => onEditStep("style")}>
            {style}
          </button>
          <span aria-hidden="true"> · </span>
          <button
            type="button"
            aria-label={`Editar forma de vivir el viaje, actualmente ${budgetStyle}`}
            onClick={() => onEditStep("budgetStyle")}
          >
            {budgetStyle}
          </button>
        </p>

        <button
          type="button"
          className="story-cover-note"
          aria-label={`Editar alojamiento, actualmente ${accommodationNote}`}
          onClick={() => onEditStep("accommodation")}
        >
          {accommodationNote}
        </button>

        {data.travelContext && (
          <button
            type="button"
            className="story-cover-context"
            aria-label={`Editar contexto, actualmente ${data.travelContext}`}
            onClick={() => onEditStep("context")}
          >
            “{data.travelContext}”
          </button>
        )}

        <p className="story-cover-sentence">{sentence}</p>
      </div>

      {submitError && <p className="trips-error">{submitError}</p>}
    </WizardShell>
  );
}
