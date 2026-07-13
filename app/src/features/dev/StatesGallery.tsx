import { Link, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { CountryCombobox } from "@/components/inputs/CountryCombobox";
import { WizardShell } from "@/components/wizard/WizardShell";
import { CheckingSession } from "@/features/auth/components/CheckingSession";
import { EmailStep } from "@/features/auth/components/EmailStep";
import { CodeStep } from "@/features/auth/components/CodeStep";
import { TripsEmpty } from "@/features/trips/components/TripsEmpty";
import { TripsIndex } from "@/features/trips/components/TripsIndex";
import { TripEntry } from "@/features/trips/components/TripEntry";
import { ActiveTripHome } from "@/features/trips/components/ActiveTripHome";
import { CreateTripWizard } from "@/features/trips/components/CreateTripWizard";
import { ArrivalStep } from "@/features/trips/components/wizard/ArrivalStep";
import { DepartureStep } from "@/features/trips/components/wizard/DepartureStep";
import { StyleStep } from "@/features/trips/components/wizard/StyleStep";
import { SummaryStep } from "@/features/trips/components/wizard/SummaryStep";
import { StoryBeginning } from "@/features/trips/components/wizard/StoryBeginning";
import { INITIAL_WIZARD_DATA } from "@/features/trips/components/wizard/wizardData";
import type { Trip } from "@/features/trips/types";
import { tripUrl } from "@/features/trips/lib/tripUrl";
import { tripTemporalState } from "@/features/trips/lib/countdown";
import { FeedbackSection } from "@/features/feedback/components/FeedbackSection";
import { TripInvitePanel } from "@/features/sharing/components/TripInvitePanel";
import { InviteUnauthenticated } from "@/features/sharing/components/InviteUnauthenticated";
import { InviteDecision } from "@/features/sharing/components/InviteDecision";
import { InviteWrongEmail } from "@/features/sharing/components/InviteWrongEmail";
import { InviteStatusScreen } from "@/features/sharing/components/InviteStatusScreen";
import type { InvitationPreview } from "@/features/sharing/types";

// Galería de estados SOLO-DEV. Renderiza cada pantalla de acceso en aislamiento,
// sin API/Mongo/login real: los componentes presentacionales reciben props fijas.
// La ruta que la monta está gateada por import.meta.env.DEV (ver router.tsx), así
// que este módulo y su chunk se eliminan del build de producción (tree-shaking del
// `false` que Vite inyecta). Uso: /dev/states  ·  /dev/states?state=login-code

const noop = () => {};

// Fecha de muestra a +8 días de "ahora": solo para que la galería tenga un
// viaje con countdown visible ("Faltan 8 días") sin importar cuándo se mire.
function sampleDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10) + "T09:30";
}

const SAMPLE_TRIPS: Trip[] = [
  {
    id: "1",
    title: "Buenos Aires, 2026",
    destination: "Santiago ✈ Buenos Aires",
    baseStoryId: "ba-2026",
    status: "active",
    role: "owner",
    updatedAt: "2026-03-02T12:00:00.000Z",
  },
  {
    id: "2",
    title: "Un fin de semana larguísimo en la costa del sur",
    destination: "Un título largo para probar el ajuste de línea",
    baseStoryId: null,
    status: "active",
    role: "owner",
    updatedAt: "2026-02-10T09:30:00.000Z",
  },
  {
    id: "3",
    title: "Mendoza",
    destination: "Ruta del vino",
    baseStoryId: null,
    status: "active",
    role: "owner",
    updatedAt: "2026-01-05T18:00:00.000Z",
  },
  {
    id: "4",
    title: "Luna de miel",
    destination: {
      countryCode: "AR",
      countryName: "Argentina",
      cityId: "nomi-111",
      cityName: "Buenos Aires",
      adminName: "CABA",
      latitude: -34.6037,
      longitude: -58.3816,
      timezone: "America/Argentina/Buenos_Aires",
    },
    baseStoryId: "ba-2026",
    status: "active",
    role: "owner",
    updatedAt: "2026-01-05T18:00:00.000Z",
    startDateTime: sampleDateInDays(8),
    endDateTime: sampleDateInDays(11),
  },
];

const SAMPLE_ACTIVE_TRIP = SAMPLE_TRIPS[3];

// Invitación de muestra para la galería (sin backend): mismos campos que devuelve
// el preview público sanitizado.
const SAMPLE_INVITATION: InvitationPreview = {
  status: "pending",
  requiresAuthentication: true,
  trip: { title: "Buenos Aires, 2026", destination: { cityName: "Buenos Aires", countryName: "Argentina" } },
  ownerDisplayName: "Camilo",
  invitedEmailMasked: "k•••@mail.com",
};

// Marco de "Mis viajes" idéntico al de TripsPage, para que el estado se vea igual.
function TripsFrame({ title, account, children }: { title?: string; account?: string; children: ReactNode }) {
  return (
    <div className="trips-page">
      <AlaiaParticles subtle />
      <div className="trips-page-content">
        <p className="alaia-eyebrow">Alaia</p>
        {title ? <h1 className="trips-title">{title}</h1> : null}
        {account ? <p className="trips-account">{account}</p> : null}
        {children}
      </div>
    </div>
  );
}

// Marco del umbral idéntico al de LoginPage.
function EntranceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="alaia-entrance">
      <AlaiaParticles />
      <div className="alaia-entrance-content">{children}</div>
    </div>
  );
}

interface GalleryState {
  label: string;
  render: () => ReactNode;
}

// Orden y claves usadas por el spec de Playwright (e2e/states.spec.ts).
export const GALLERY_STATES: Record<string, GalleryState> = {
  checking: {
    label: "Revisando sesión",
    render: () => <CheckingSession />,
  },
  "login-email": {
    label: "Login · email",
    render: () => (
      <EntranceFrame>
        <EmailStep defaultEmail="" submitting={false} submitError={null} onSubmit={noop} />
      </EntranceFrame>
    ),
  },
  sending: {
    label: "Login · enviando código",
    render: () => (
      <EntranceFrame>
        <EmailStep defaultEmail="agus@ejemplo.com" submitting submitError={null} onSubmit={noop} />
      </EntranceFrame>
    ),
  },
  "send-error": {
    label: "Login · error al enviar",
    render: () => (
      <EntranceFrame>
        <EmailStep
          defaultEmail="agus@ejemplo.com"
          submitting={false}
          submitError="No pudimos enviar el código. Intentá nuevamente."
          onSubmit={noop}
        />
      </EntranceFrame>
    ),
  },
  "login-code": {
    label: "Login · código",
    render: () => (
      <EntranceFrame>
        <CodeStep
          email="agus@ejemplo.com"
          submitting={false}
          submitError={null}
          onSubmit={noop}
          onUseAnotherEmail={noop}
        />
      </EntranceFrame>
    ),
  },
  "invalid-code": {
    label: "Login · código inválido",
    render: () => (
      <EntranceFrame>
        <CodeStep
          email="agus@ejemplo.com"
          submitting={false}
          submitError="El código no es correcto. Intentá nuevamente."
          onSubmit={noop}
          onUseAnotherEmail={noop}
        />
      </EntranceFrame>
    ),
  },
  "trips-empty": {
    label: "Mis viajes · vacío",
    render: () => (
      <TripsFrame title="Mis viajes">
        <TripsEmpty onCreate={noop} />
        <button type="button" className="trips-logout">
          Cerrar sesión
        </button>
      </TripsFrame>
    ),
  },
  "trips-list": {
    label: "Mis viajes · lista",
    render: () => (
      <TripsFrame title="Mis viajes" account="agus@ejemplo.com">
        <section className="trips-active" aria-label="Tu historia activa">
          <ul className="trips-active-list">
            <TripEntry trip={SAMPLE_ACTIVE_TRIP} index={0} now={new Date()} featured />
          </ul>
        </section>
        <h2 className="trips-section-title">Otras historias</h2>
        <TripsIndex trips={SAMPLE_TRIPS.filter((trip) => trip.id !== SAMPLE_ACTIVE_TRIP.id)} />
        <button type="button" className="trips-create-link">
          + Un nuevo viaje
        </button>
        <section className="feedback-teaser" aria-labelledby="dev-feedback-teaser-title">
          <h2 id="dev-feedback-teaser-title" className="feedback-teaser-title">
            Ayúdanos a mejorar Alaia
          </h2>
          <p>Tu mirada también forma parte de esta historia.</p>
          <Link className="feedback-teaser-link" to="/feedback">
            Enviar sugerencia →
          </Link>
        </section>
        <button type="button" className="trips-logout">
          Cerrar sesión
        </button>
      </TripsFrame>
    ),
  },
  "trip-home": {
    label: "Portada del viaje",
    render: () => (
      <TripsFrame title="">
        <Link className="trips-secondary-nav" to="/trips">
          ← Volver a Mis viajes
        </Link>
        <ActiveTripHome
          trip={SAMPLE_ACTIVE_TRIP}
          lifecycle="upcoming"
          temporalState={tripTemporalState(
            new Date(),
            SAMPLE_ACTIVE_TRIP.startDateTime ?? "",
            SAMPLE_ACTIVE_TRIP.endDateTime ?? "",
            "America/Argentina/Buenos_Aires",
          )}
          to={tripUrl(SAMPLE_ACTIVE_TRIP.id)}
        />
        <TripInvitePanel
          trip={{
            ...SAMPLE_ACTIVE_TRIP,
            role: "owner",
            members: [{ userId: "u1", role: "owner", joinedAt: "2026-01-05T18:00:00.000Z" }],
            expectedTravelers: 2,
          }}
        />
      </TripsFrame>
    ),
  },
  feedback: {
    label: "Feedback",
    render: () => (
      <TripsFrame title="">
        <Link className="trips-secondary-nav" to="/trips">
          ← Volver a Mis viajes
        </Link>
        <FeedbackSection />
      </TripsFrame>
    ),
  },
  "create-trip": {
    label: "Crear viaje",
    // El wizard es su propia pantalla completa (WizardShell trae eyebrow +
    // título + partículas): no se envuelve en TripsFrame.
    render: () => <CreateTripWizard onCancel={noop} />,
  },
  "onboarding-name": {
    label: "Alaia · onboarding (nombre)",
    render: () => (
      <WizardShell question="¿Cómo quieres que te llamemos?" onNext={noop} nextDisabled={false}>
        <label htmlFor="dev-onboarding-name">Nombre</label>
        <input id="dev-onboarding-name" type="text" defaultValue="Kari" />
      </WizardShell>
    ),
  },
  "onboarding-country": {
    label: "Alaia · onboarding (país)",
    render: () => (
      <WizardShell question="¿Desde dónde viajás?" onBack={noop} onNext={noop} nextDisabled={false}>
        <CountryCombobox label="País de residencia" value={null} onChange={noop} autoFocus />
      </WizardShell>
    ),
  },
  "trip-arrival-step": {
    label: "Alaia · llegada (fecha + hora)",
    render: () => (
      <ArrivalStep
        value="2026-07-18T09:30"
        cityName="Buenos Aires"
        onChange={noop}
        onBack={noop}
        onNext={noop}
        canAdvance
      />
    ),
  },
  "trip-departure-step": {
    label: "Alaia · regreso (fecha + hora)",
    render: () => (
      <DepartureStep
        value=""
        minDateTime="2026-07-18T09:30"
        cityName="Buenos Aires"
        onChange={noop}
        onBack={noop}
        onNext={noop}
        canAdvance={false}
      />
    ),
  },
  "trip-departure-step-error": {
    label: "Alaia · regreso (error: antes de la llegada)",
    render: () => (
      <DepartureStep
        value="2026-07-18T08:00"
        minDateTime="2026-07-18T09:30"
        cityName="Buenos Aires"
        onChange={noop}
        onBack={noop}
        onNext={noop}
        canAdvance={false}
      />
    ),
  },
  "trip-style-step": {
    label: "Alaia · estilo del viaje (chips)",
    render: () => (
      <StyleStep value={["romantic", "gastronomic"]} onChange={noop} onBack={noop} onNext={noop} canAdvance />
    ),
  },
  "trip-summary": {
    label: "Alaia · portada del resumen",
    render: () => (
      <SummaryStep
        data={{
          ...INITIAL_WIZARD_DATA,
          title: "Luna de miel",
          country: { code: "AR", name: "Argentina" },
          city: {
            id: "nomi-111",
            name: "Buenos Aires",
            adminName: "CABA",
            countryCode: "AR",
            countryName: "Argentina",
            latitude: -34.6037,
            longitude: -58.3816,
            timezone: "America/Argentina/Buenos_Aires",
          },
          startDateTime: "2026-07-18T09:30",
          endDateTime: "2026-07-21T22:00",
          travelCompanions: "partner",
          expectedTravelers: 2,
          travelReason: "honeymoon",
          travelStyle: ["romantic", "gastronomic"],
          travelBudgetStyle: "balanced",
          accommodation: { type: "hotel", name: "Hotel Alaia, Palermo" },
        }}
        onEditStep={noop}
        onBack={noop}
        onBegin={noop}
      />
    ),
  },
  "story-beginning": {
    label: "Alaia · comienza la historia (transición)",
    render: () => <StoryBeginning run={() => new Promise<Trip>(() => {})} onSuccess={noop} onError={noop} />,
  },
  "invite-unauthenticated": {
    label: "Invitación · sin sesión",
    render: () => <InviteUnauthenticated token="demo-token" invitation={SAMPLE_INVITATION} />,
  },
  "invite-decision": {
    label: "Invitación · decisión (aceptar/rechazar)",
    render: () => <InviteDecision token="demo-token" invitation={SAMPLE_INVITATION} />,
  },
  "invite-wrong-email": {
    label: "Invitación · otro correo",
    render: () => <InviteWrongEmail />,
  },
  "invite-expired": {
    label: "Invitación · vencida",
    render: () => <InviteStatusScreen variant="expired" />,
  },
};

export default function StatesGallery() {
  const [params] = useSearchParams();
  const requested = params.get("state");

  if (requested && GALLERY_STATES[requested]) {
    return <>{GALLERY_STATES[requested].render()}</>;
  }

  // Índice de la galería (sin ?state=). Chrome mínimo, solo dev.
  return (
    <div className="trips-page">
      <div className="trips-page-content">
        <p className="alaia-eyebrow">Alaia · dev</p>
        <h1 className="trips-title">Galería de estados</h1>
        <p className="trips-account">
          Cada pantalla de acceso en aislamiento, sin backend. Solo desarrollo.
        </p>
        <ul className="trips-index">
          {Object.entries(GALLERY_STATES).map(([key, { label }]) => (
            <li key={key} className="trip-index-item">
              <Link className="trip-entry" to={`/dev/states?state=${key}`}>
                <span className="trip-entry-text">
                  <span className="trip-entry-title">{label}</span>
                  <span className="trip-entry-status">?state={key}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
