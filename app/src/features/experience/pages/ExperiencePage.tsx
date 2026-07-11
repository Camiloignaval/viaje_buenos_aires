import { Navigate } from "react-router-dom";
import { ExperienceContext } from "../components/experienceContext";
import { ExperienceView } from "../components/ExperienceView";
import { ExperienceUnavailable } from "../components/ExperienceUnavailable";
import { ConnectedStatusBadge } from "@/features/connected/components/ConnectedStatusBadge";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { useTripId } from "@/features/connected/hooks/useTripId";
import { useExperience } from "../hooks/useExperience";
import { useResolvedStory } from "../hooks/useResolvedStory";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { auroraStoryPackage } from "../data/auroraStory";
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
        <ExperienceContext.Provider value={value}>
          <ExperienceView />
        </ExperienceContext.Provider>
      </div>
      <ConnectedStatusBadge />
    </>
  );
}

// Ruta /experience. Ya NO importa una historia fija: resuelve la del viaje real a
// través de la capa connected (useResolvedStory) y decide qué mostrar. Default
// export para lazy().
export default function ExperiencePage() {
  const resolved = useResolvedStory();
  const tripId = useTripId();

  switch (resolved.kind) {
    case "loading":
      return <LoadingScreen />;
    case "local":
      // Sin tripId. La demo de Buenos Aires es SOLO desarrollo/QA (import.meta.env.DEV,
      // que Vite reemplaza por `false` en producción → esta rama y su import se
      // eliminan por DCE). En producción, /experience sin tripId NUNCA carga una
      // historia: redirige de forma controlada a la lista de viajes. Sin fallback
      // implícito a Buenos Aires. Es el ÚNICO uso del package estático.
      return import.meta.env.DEV ? (
        <ExperienceRuntime storyPackage={auroraStoryPackage} />
      ) : (
        <Navigate to="/trips" replace />
      );
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
