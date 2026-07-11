import { useState } from "react";
import { AuroraParticles } from "@/components/animations/AuroraParticles";
import { useSession } from "@/features/auth/hooks/useSession";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useTrips } from "../hooks/useTrips";
import { TripsIndex } from "../components/TripsIndex";
import { TripsEmpty } from "../components/TripsEmpty";
import { CreateTripWizard } from "../components/CreateTripWizard";
import { ActiveTripHome } from "../components/ActiveTripHome";
import { tripHomeUrl } from "../lib/tripUrl";
import { resolveInitialAlaiaDestination } from "../lib/initialDestination";
import { FeedbackSection } from "@/features/feedback/components/FeedbackSection";

// "Mis viajes" — la página siguiente del mismo libro. Reúne índice, escena
// vacía y creación en una sola pantalla editorial, igual que el viejo
// renderAuthenticated(). Default export para lazy() en el router.
export default function TripsPage() {
  const [creating, setCreating] = useState(false);
  const { user } = useSession();
  const trips = useTrips();
  const logout = useLogout();

  if (creating) {
    // El wizard es su propia secuencia de pantallas completas (cada paso trae
    // eyebrow + título + partículas vía WizardShell) — no se lo envuelve en
    // otro .trips-page.
    return <CreateTripWizard onCancel={() => setCreating(false)} />;
  }

  const list = trips.data?.trips ?? [];
  const isEmpty = trips.isSuccess && list.length === 0;
  const hasTrips = trips.isSuccess && list.length > 0;
  const initialDestination = trips.isSuccess
    ? resolveInitialAlaiaDestination(list)
    : null;

  return (
    <div className="trips-page">
      <AuroraParticles subtle />
      <div className="trips-page-content">
        <p className="aurora-eyebrow aurora-reveal aurora-reveal-1">Alaia</p>
        <h1 className="trips-title aurora-reveal aurora-reveal-2">Mis viajes</h1>
        {!isEmpty && (
          <p className="trips-account aurora-reveal aurora-reveal-3">
            {user?.email ?? ""}
          </p>
        )}

        {trips.isPending && (
          <p className="trips-loading aurora-reveal aurora-reveal-3">
            Buscando tus viajes…
          </p>
        )}

        {trips.isError && (
          <>
            <p className="trips-error">
              {trips.error instanceof Error
                ? trips.error.message
                : "No se pudieron cargar los viajes."}
            </p>
            <button
              type="button"
              className="trips-create-link"
              onClick={() => void trips.refetch()}
            >
              Reintentar
            </button>
          </>
        )}

        {isEmpty && <TripsEmpty onCreate={() => setCreating(true)} />}
        {initialDestination?.kind === "active-trip-home" && (
          <ActiveTripHome
            trip={initialDestination.trip}
            lifecycle={initialDestination.lifecycle}
            temporalState={initialDestination.temporalState}
            to={tripHomeUrl(initialDestination.trip.id)}
          />
        )}
        {hasTrips && <TripsIndex trips={list} />}
        {hasTrips && (
          <button
            type="button"
            className="trips-create-link aurora-reveal aurora-reveal-4"
            onClick={() => setCreating(true)}
          >
            + Un nuevo viaje
          </button>
        )}

        {!trips.isPending && !trips.isError && <FeedbackSection />}

        <button
          type="button"
          className="trips-logout aurora-reveal aurora-reveal-5"
          onClick={() => logout.mutate()}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
