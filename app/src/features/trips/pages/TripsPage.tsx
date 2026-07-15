import { useState } from "react";
import { Link } from "react-router-dom";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { useTrips } from "../hooks/useTrips";
import { TripsIndex } from "../components/TripsIndex";
import { TripEntry } from "../components/TripEntry";
import { TripsEmpty } from "../components/TripsEmpty";
import { CreateTripWizard } from "../components/CreateTripWizard";
import { resolveInitialAlaiaDestination } from "../lib/initialDestination";

// "Mis viajes" — la página siguiente del mismo libro. Reúne índice, escena
// vacía y creación en una sola pantalla editorial, igual que el viejo
// renderAuthenticated(). Default export para lazy() en el router.
export default function TripsPage() {
  const [creating, setCreating] = useState(false);
  const trips = useTrips();

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
  const activeTrip = initialDestination?.kind === "active-trip-home" ? initialDestination.trip : null;
  const indexTrips = activeTrip ? list.filter((trip) => trip.id !== activeTrip.id) : list;
  const shouldRenderIndex = trips.isSuccess && indexTrips.length > 0;
  const now = new Date();

  return (
    <div className="trips-page">
      <AlaiaParticles subtle />
      <div className="trips-page-content">
        <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">Alaia</p>
        <h1 className="trips-title alaia-reveal alaia-reveal-2">Mis viajes</h1>
        <Link className="trips-personal-link alaia-reveal alaia-reveal-3" to="/para-ustedes">
          Para ustedes →
        </Link>

        {trips.isPending && (
          <p className="trips-loading alaia-reveal alaia-reveal-3">
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
        {activeTrip && (
          <section className="trips-active alaia-reveal alaia-reveal-3" aria-label="Tu historia activa">
            <ul className="trips-active-list">
              <TripEntry trip={activeTrip} index={0} now={now} featured />
            </ul>
          </section>
        )}
        {shouldRenderIndex && (
          <section className="trips-index-section alaia-reveal alaia-reveal-4" aria-labelledby={activeTrip ? "other-trips-title" : undefined}>
            {activeTrip && (
              <h2 id="other-trips-title" className="trips-section-title">
                Otras historias
              </h2>
            )}
            <TripsIndex trips={indexTrips} />
          </section>
        )}
        {hasTrips && (
          <button
            type="button"
            className="trips-create-link alaia-reveal alaia-reveal-4"
            onClick={() => setCreating(true)}
          >
            + Un nuevo viaje
          </button>
        )}
      </div>
    </div>
  );
}
