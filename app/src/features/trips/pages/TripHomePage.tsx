import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { useSession } from "@/features/auth/hooks/useSession";
import type { User } from "@/features/auth/types";
import { useConnectedTrip } from "@/features/connected/hooks/useConnectedTrip";
import { useStoryContent } from "@/features/connected/hooks/useConnectedContent";
import { ExperienceUnavailable } from "@/features/experience/components/ExperienceUnavailable";
import { VisibleCompanionExperience } from "@/features/experience/components/VisibleCompanionExperience";
import { useFirstVisibleExperience } from "@/features/experience/hooks/useFirstVisibleExperience";
import { resolveStory } from "@/features/experience/hooks/useResolvedStory";
import { rememberTrip } from "@/features/pwa/continuityStore";
import { TripInvitePanel } from "@/features/sharing/components/TripInvitePanel";
import type { StoryPackage } from "@/features/story/engine/types";
import { ActiveTripHome } from "../components/ActiveTripHome";
import { resolveTripLifecycle } from "../lib/initialDestination";
import { tripUrl } from "../lib/tripUrl";
import type { Trip } from "../types";

function storyObservation(dataUpdatedAt: number | undefined): string | null {
  if (!dataUpdatedAt) return null;
  const observedAt = new Date(dataUpdatedAt);
  return Number.isFinite(observedAt.getTime()) ? observedAt.toISOString() : null;
}

function SettledTripHome(props: Readonly<{
  trip: Trip;
  user: User | null;
  storyPackage: StoryPackage | null;
  storyObservedAt: string | null;
  storyReady: boolean;
}>) {
  const { trip, user, storyPackage, storyObservedAt, storyReady } = props;
  const visible = useFirstVisibleExperience({ trip, user, storyPackage, storyObservedAt });
  if (visible.status === "loading") return <LoadingScreen />;

  const { lifecycle, temporalState } = resolveTripLifecycle(trip, new Date());
  const companionMoment = visible.viewModel
    ? <VisibleCompanionExperience viewModel={visible.viewModel} observer={visible.observer} />
    : null;

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
          companionMoment={companionMoment}
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

// Portada del viaje: resuelve primero datos, historia y el momento autorizado;
// recién entonces monta la composición completa para evitar inserciones tardías.
export default function TripHomePage() {
  const { user } = useSession();
  const { tripId } = useParams();
  const tripState = useConnectedTrip(tripId ?? null);
  const content = useStoryContent(tripState);
  const resolved = resolveStory(tripState, content);

  const openedTripId = tripState.trip?.id ?? null;
  useEffect(() => {
    if (openedTripId && user?.id) rememberTrip(user.id, openedTripId);
  }, [openedTripId, user?.id]);

  if (resolved.kind === "loading" || resolved.kind === "local") return <LoadingScreen />;
  if (resolved.kind === "not-found") return <ExperienceUnavailable variant="not-found" />;
  if (resolved.kind === "error") return <ExperienceUnavailable variant="error" tripId={tripId} />;

  const trip = tripState.trip;
  if (!trip) return <ExperienceUnavailable variant="not-found" />;

  const storyReady = resolved.kind === "ready";
  return (
    <SettledTripHome
      trip={trip}
      user={user}
      storyPackage={resolved.kind === "ready" ? resolved.storyPackage : null}
      storyObservedAt={resolved.kind === "ready" ? storyObservation(content.dataUpdatedAt) : null}
      storyReady={storyReady}
    />
  );
}
