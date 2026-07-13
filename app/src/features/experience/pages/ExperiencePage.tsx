import { Link, Navigate } from "react-router-dom";
import { ExperienceContext } from "../components/experienceContext";
import { ExperienceView } from "../components/ExperienceView";
import { ExperienceUnavailable } from "../components/ExperienceUnavailable";
import { ConnectedStatusBadge } from "@/features/connected/components/ConnectedStatusBadge";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireOnboarding } from "@/features/onboarding/components/RequireOnboarding";
import { useTripId } from "@/features/connected/hooks/useTripId";
import { useExperience } from "../hooks/useExperience";
import { useResolvedStory } from "../hooks/useResolvedStory";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { demoStoryPackage } from "../data/demoStory";
import type { StoryPackage } from "@/features/story/engine/types";
import "../experience.css";

// Runtime real de la experiencia cinematográfica. Recibe un Story Package ya
// resuelto y validado + el scope de persistencia (tripId del viaje, o el id del
// package en el demo local). Monta dentro de <div id="app"> para que
// experience.css (selectores #app:has(...)) aplique igual que en experience.html.
// Los hooks viven acá — así se llaman de forma incondicional, sin violar las
// reglas de hooks del switch de ExperiencePage.
function ExperienceRuntime({
  storyPackage,
  scopeId,
}: {
  storyPackage: StoryPackage;
  scopeId?: string;
}) {
  const { value, appRef, revealSignature } = useExperience(storyPackage, scopeId);
  useRevealOnScroll(appRef, revealSignature);

  return (
    <>
      <div id="app" ref={appRef}>
        {scopeId ? (
          <Link className="experience-trips-nav" to="/trips">
            ← Mis viajes
          </Link>
        ) : null}
        <ExperienceContext.Provider value={value}>
          <ExperienceView />
        </ExperienceContext.Provider>
      </div>
      <ConnectedStatusBadge />
    </>
  );
}

// La rama conectada se monta RECIÉN después de auth + onboarding. Mantener este
// hook en un hijo de ambos guards evita que el deep link dispare getTrip/getStory
// mientras todavía no se ha validado la sesión.
function ConnectedExperience() {
  const resolved = useResolvedStory();
  const tripId = useTripId();

  switch (resolved.kind) {
    case "loading":
      return <LoadingScreen />;
    case "local":
      return <Navigate to="/trips" replace />;
    case "ready":
      return <ExperienceRuntime storyPackage={resolved.storyPackage} scopeId={resolved.scopeId} />;
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
