import { Link, Navigate } from "react-router-dom";
import { ExperienceContext, useExperienceCtx } from "../components/experienceContext";
import { ExperienceView, experienceUsesReadingTopbar } from "../components/ExperienceView";
import { ExperienceUnavailable } from "../components/ExperienceUnavailable";
import { DirectorPanel } from "../components/DirectorPanel";
import { ConnectedStatusBadge } from "@/features/connected/components/ConnectedStatusBadge";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireOnboarding } from "@/features/onboarding/components/RequireOnboarding";
import { useTripId } from "@/features/connected/hooks/useTripId";
import { useConnectedTrip } from "@/features/connected/hooks/useConnectedTrip";
import { useSession } from "@/features/auth/hooks/useSession";
import { useExperience } from "../hooks/useExperience";
import { useProductiveAdaptiveJourney, type ProductiveAdaptiveJourneyState } from "../hooks/useProductiveAdaptiveJourney";
import { useResolvedStory } from "../hooks/useResolvedStory";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { demoStoryPackage } from "../data/demoStory";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import type { User } from "@/features/auth/types";
import "../experience.css";
import "../dayLived.css";

function ExperienceTripsNavigation() {
  const experience = useExperienceCtx();

  if (experienceUsesReadingTopbar(experience)) {
    return null;
  }

  return (
    <Link className="experience-trips-nav" to="/trips">
      ← Volver a Mis viajes
    </Link>
  );
}

// Runtime real de la experiencia cinematográfica. Recibe un Story Package ya
// resuelto y validado + el scope de persistencia (tripId del viaje, o el id del
// package en el demo local). Monta dentro de <div id="app"> para que
// experience.css (selectores #app:has(...)) aplique igual que en experience.html.
// Los hooks viven acá — así se llaman de forma incondicional, sin violar las
// reglas de hooks del switch de ExperiencePage.
function ExperienceRuntime({
  storyPackage,
  scopeId,
  tripTimezone,
  contextualCompanion = null,
}: {
  storyPackage: StoryPackage;
  scopeId?: string;
  tripTimezone?: string;
  contextualCompanion?: ProductiveAdaptiveJourneyState | null;
}) {
  const { value, appRef, revealSignature } = useExperience(storyPackage, scopeId, tripTimezone);
  const productiveValue = scopeId ? {
    ...value,
    contextualCompanion,
    semanticMemoryScope: {
      tripId: scopeId,
      storyId: storyPackage.storyId,
      observer: contextualCompanion?.observer,
    },
  } : value;
  useRevealOnScroll(appRef, revealSignature);

  return (
    <>
      <div id="app" ref={appRef}>
        <ExperienceContext.Provider value={productiveValue}>
          {scopeId ? <ExperienceTripsNavigation /> : null}
          <ExperienceView />
          {/* Modo director: dev-only. En prod `import.meta.env.DEV` es `false` y
              Rollup elimina el panel del build por dead-code elimination. */}
          {import.meta.env.DEV ? <DirectorPanel /> : null}
        </ExperienceContext.Provider>
      </div>
      <ConnectedStatusBadge />
    </>
  );
}

function ProductiveExperienceRuntime({
  storyPackage,
  scopeId,
  trip,
  user,
}: Readonly<{ storyPackage: StoryPackage; scopeId: string; trip: Trip; user: User }>) {
  const contextualCompanion = useProductiveAdaptiveJourney({
    trip,
    user,
    storyPackage,
    storyObservedAt: trip.updatedAt,
  });
  return (
    <ExperienceRuntime
      storyPackage={storyPackage}
      scopeId={scopeId}
      tripTimezone={typeof trip.destination === "string" ? undefined : trip.destination.timezone}
      contextualCompanion={contextualCompanion}
    />
  );
}

// La rama conectada se monta RECIÉN después de auth + onboarding. Mantener este
// hook en un hijo de ambos guards evita que el deep link dispare getTrip/getStory
// mientras todavía no se ha validado la sesión.
function ConnectedExperience() {
  const resolved = useResolvedStory();
  const tripId = useTripId();
  const tripState = useConnectedTrip(tripId);
  const session = useSession();

  switch (resolved.kind) {
    case "loading":
      return <LoadingScreen />;
    case "local":
      return <Navigate to="/trips" replace />;
    case "ready":
      return tripState.trip && session.user ? (
        <ProductiveExperienceRuntime
          storyPackage={resolved.storyPackage}
          scopeId={resolved.scopeId}
          trip={tripState.trip}
          user={session.user}
        />
      ) : <ExperienceRuntime storyPackage={resolved.storyPackage} scopeId={resolved.scopeId} />;
    case "empty":
      return <ExperienceUnavailable variant="empty" tripId={tripId} />;
    case "not-found":
      return <ExperienceUnavailable variant="not-found" />;
    case "error":
      return <ExperienceUnavailable variant="error" tripId={tripId} />;
  }
}

// Ruta /experience. Sin tripId conserva el comportamiento local/demo existente.
// Con tripId, los guards envuelven la rama conectada y permanecen suscritos a la
// sesión: un 401 posterior desmonta las queries y vuelve al login con el deep link
// exacto en returnTo.
export default function ExperiencePage() {
  const tripId = useTripId();

  if (!tripId) {
    // La demo de Buenos Aires es SOLO desarrollo/QA (import.meta.env.DEV, que
    // Vite reemplaza por `false` en producción). En producción, /experience sin
    // tripId redirige a la lista de viajes, sin fallback implícito a Buenos Aires.
    return import.meta.env.DEV ? (
      <ExperienceRuntime storyPackage={demoStoryPackage} />
    ) : (
      <Navigate to="/trips" replace />
    );
  }

  return (
    <RequireAuth>
      <RequireOnboarding>
        <ConnectedExperience />
      </RequireOnboarding>
    </RequireAuth>
  );
}
