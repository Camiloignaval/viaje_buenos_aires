import { Link, useParams } from "react-router-dom";
import { useConnectedTrip } from "@/features/connected/hooks/useConnectedTrip";
import { useStoryContent } from "@/features/connected/hooks/useConnectedContent";
import { resolveStory } from "@/features/experience/hooks/useResolvedStory";
import { ExperienceUnavailable } from "@/features/experience/components/ExperienceUnavailable";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { TripInvitePanel } from "@/features/sharing/components/TripInvitePanel";
import { ActiveTripHome } from "../components/ActiveTripHome";
import { resolveTripLifecycle } from "../lib/initialDestination";
import { tripUrl } from "../lib/tripUrl";

// Portada del viaje (`/trips/:tripId`): el universo del viaje recién creado y el
// punto de entrada VOLUNTARIO a la Experience. Comparte la resolución de historia
// con ExperiencePage (resolveStory) para que ambas coincidan siempre: el CTA
// "Entrar al viaje" solo aparece cuando la historia está resuelta. Default export
// para lazy() en el router.
export default function TripHomePage() {
  const { tripId } = useParams();
  const tripState = useConnectedTrip(tripId ?? null);
  const content = useStoryContent(tripState);
  const resolved = resolveStory(tripState, content);

  if (resolved.kind === "loading" || resolved.kind === "local") return <LoadingScreen />;
  if (resolved.kind === "not-found") return <ExperienceUnavailable variant="not-found" />;
  if (resolved.kind === "error") return <ExperienceUnavailable variant="error" tripId={tripId} />;

  // ready | empty → el viaje existe y se muestra su Portada.
  const trip = tripState.trip;
  if (!trip) return <ExperienceUnavailable variant="not-found" />; // defensivo (no debería ocurrir)

  const storyReady = resolved.kind === "ready";
  const { lifecycle, temporalState } = resolveTripLifecycle(trip, new Date());

  return (
    <div className="trips-page">
      <AlaiaParticles subtle />
      <div className="trips-page-content">
        <Link className="trips-secondary-nav alaia-reveal alaia-reveal-1" to="/trips">
          ← Volver a Mis viajes
        </Link>
        <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">Alaia</p>
        <ActiveTripHome
          trip={trip}
          lifecycle={lifecycle}
          temporalState={temporalState}
          to={tripUrl(trip.id)}
          showAction={storyReady}
        />
        {!storyReady && (
          <p className="active-trip-home-preparations alaia-reveal alaia-reveal-4">
            Tu historia todavía no está lista. Cuando esté disponible, vas a poder entrar desde aquí.
          </p>
        )}
        <TripInvitePanel trip={trip} />
      </div>
    </div>
  );
}
