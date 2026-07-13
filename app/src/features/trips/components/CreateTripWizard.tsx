import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTrip } from "../hooks/useCreateTrip";
import { shouldPlayTripCreationSignature, TRIP_CREATION_SIGNATURE_VARIANT } from "../lib/creationSignature";
import { tripHomeUrl } from "../lib/tripUrl";
import type { Trip } from "../types";
import {
  INITIAL_WIZARD_DATA,
  WIZARD_STEPS,
  canAdvanceFrom,
  nextStepIndex,
  previousStepIndex,
  buildCreateTripInput,
  type WizardData,
  type WizardStep,
} from "./wizard/wizardData";
import { TitleStep } from "./wizard/TitleStep";
import { CountryStep } from "./wizard/CountryStep";
import { CityStep } from "./wizard/CityStep";
import { ArrivalStep } from "./wizard/ArrivalStep";
import { DepartureStep } from "./wizard/DepartureStep";
import { AccommodationStep } from "./wizard/AccommodationStep";
import { CompanionsStep } from "./wizard/CompanionsStep";
import { TravelersStep } from "./wizard/TravelersStep";
import { ReasonStep } from "./wizard/ReasonStep";
import { StyleStep } from "./wizard/StyleStep";
import { BudgetStyleStep } from "./wizard/BudgetStyleStep";
import { BudgetAmountStep } from "./wizard/BudgetAmountStep";
import { ContextStep } from "./wizard/ContextStep";
import { SummaryStep } from "./wizard/SummaryStep";
import { StoryBeginning } from "./wizard/StoryBeginning";

interface Props {
  onCancel: () => void;
}

// El primer encuentro de Alaia con una historia: una conversaciÃ³n por
// pantalla (spec "Alaia"), nunca un formulario. El estado vive acÃ¡ arriba â€”
// "volver" nunca pierde datos ya ingresados. Tras el resumen, una transiciÃ³n
// narrativa (StoryBeginning) antes de abrir la historia reciÃ©n creada.
export function CreateTripWizard({ onCancel }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_WIZARD_DATA);
  const [phase, setPhase] = useState<"wizard" | "beginning">("wizard");
  const create = useCreateTrip();
  const navigate = useNavigate();

  const step = WIZARD_STEPS[stepIndex];
  const canAdvance = canAdvanceFrom(step, data);

  function update(patch: Partial<WizardData>) {
    setData((current) => ({ ...current, ...patch }));
  }

  function goBack() {
    if (stepIndex === 0) {
      onCancel();
      return;
    }
    setStepIndex((index) => previousStepIndex(index, data));
  }

  function goNext() {
    if (!canAdvanceFrom(step, data)) return;
    setStepIndex((index) => nextStepIndex(index, data));
  }

  function goToStep(target: WizardStep) {
    const index = WIZARD_STEPS.indexOf(target);
    if (index >= 0) setStepIndex(index);
  }

  async function createTrip() {
    const { trip } = await create.mutateAsync(buildCreateTripInput(data));
    return trip;
  }

  function handleStorySuccess(trip: Trip) {
    // Tras crear el viaje se aterriza en SU Portada (/trips/:id), no en la lista
    // general: el universo del viaje recién creado, desde donde se entra a la
    // Experience de forma voluntaria (navegación SPA, sin recarga).
    // Punto de extensión futuro: cuando exista el asset/contrato de
    // `variant="micro"`, este es el lugar para intercalar la Micro Signature
    // ANTES de navegar. Hoy NO se reutiliza el opening global ni el intro.
    if (TRIP_CREATION_SIGNATURE_VARIANT === "micro" && shouldPlayTripCreationSignature()) {
      navigate(tripHomeUrl(trip.id));
      return;
    }
    navigate(tripHomeUrl(trip.id));
  }

  function handleStoryError() {
    setPhase("wizard"); // vuelve al resumen; create.isError alimenta el mensaje ahÃ­.
  }

  if (phase === "beginning") {
    return <StoryBeginning run={createTrip} onSuccess={handleStorySuccess} onError={handleStoryError} />;
  }

  switch (step) {
    case "title":
      return (
        <TitleStep
          value={data.title}
          onChange={(title) => update({ title })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "country":
      return (
        <CountryStep
          value={data.country}
          onChange={(country) =>
            update({ country, city: data.country?.code === country.code ? data.city : null })
          }
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "city":
      return (
        <CityStep
          countryCode={data.country?.code ?? null}
          value={data.city}
          onChange={(city) => update({ city })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "arrival":
      return (
        <ArrivalStep
          value={data.startDateTime}
          cityName={data.city?.name ?? null}
          timeZone={data.city?.timezone}
          onChange={(startDateTime) => update({ startDateTime })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "departure":
      return (
        <DepartureStep
          value={data.endDateTime}
          minDateTime={data.startDateTime}
          cityName={data.city?.name ?? null}
          timeZone={data.city?.timezone}
          onChange={(endDateTime) => update({ endDateTime })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "accommodation":
      return (
        <AccommodationStep
          countryCode={data.city?.countryCode ?? null}
          cityName={data.city?.name ?? null}
          value={data.accommodation}
          onChange={(accommodation) => update({ accommodation })}
          onBack={goBack}
          onNext={goNext}
        />
      );
    case "companions":
      return (
        <CompanionsStep
          value={data.travelCompanions}
          onChange={(travelCompanions) => update({ travelCompanions })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "travelers":
      return (
        <TravelersStep
          value={data.expectedTravelers}
          onChange={(expectedTravelers) => update({ expectedTravelers })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "reason":
      return (
        <ReasonStep
          value={data.travelReason}
          onChange={(travelReason) => update({ travelReason })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "style":
      return (
        <StyleStep
          value={data.travelStyle}
          onChange={(travelStyle) => update({ travelStyle })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "budgetStyle":
      return (
        <BudgetStyleStep
          value={data.travelBudgetStyle}
          onChange={(travelBudgetStyle) => update({ travelBudgetStyle })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "budgetAmount":
      return (
        <BudgetAmountStep
          amount={data.budgetAmount}
          currency={data.budgetCurrency}
          onChangeAmount={(budgetAmount) => update({ budgetAmount })}
          onChangeCurrency={(budgetCurrency) => update({ budgetCurrency })}
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
        />
      );
    case "context":
      return (
        <ContextStep
          value={data.travelContext}
          onChange={(travelContext) => update({ travelContext })}
          onBack={goBack}
          onNext={goNext}
        />
      );
    case "summary":
      return (
        <SummaryStep
          data={data}
          onEditStep={goToStep}
          onBack={goBack}
          onBegin={() => setPhase("beginning")}
          submitError={
            create.isError
              ? create.error instanceof Error
                ? create.error.message
                : "No se pudo crear el viaje."
              : null
          }
        />
      );
    default:
      return null;
  }
}
