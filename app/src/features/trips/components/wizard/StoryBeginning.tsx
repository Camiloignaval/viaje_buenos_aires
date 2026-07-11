import { useEffect, useRef } from "react";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import type { Trip } from "../../types";

// Un poco más que el mínimo de 2s del spec: le da tiempo a la segunda línea
// (que revela recién a los 1s, para que la pausa entre ambas se sienta real)
// de quedarse quieta un instante antes de que la transición pueda cortar.
const MIN_DISPLAY_MS = 2600;

interface Props {
  run: () => Promise<Trip>;
  onSuccess: (trip: Trip) => void;
  onError: () => void;
}

// Transición narrativa tras "Comenzar esta historia →": nunca un spinner ni un
// "Loading…" — el mismo halo/partículas/fade de Experience, con Alaia
// presentándose. `onSuccess`/`onError` solo se disparan después de que TANTO
// `run()` resuelve COMO el mínimo de ~2.6s transcurrió — así la permanencia
// mínima se respeta incluso si el backend responde al instante.
export function StoryBeginning({ run, onSuccess, onError }: Props) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const minDelay = new Promise<void>((resolve) => {
      setTimeout(resolve, MIN_DISPLAY_MS);
    });

    void Promise.allSettled([run(), minDelay]).then(([runResult]) => {
      if (runResult.status === "fulfilled") {
        onSuccess(runResult.value);
      } else {
        onError();
      }
    });
  }, [run, onSuccess, onError]);

  return (
    <div className="alaia-entrance">
      <AlaiaParticles subtle />
      <div className="alaia-loading alaia-loading-story" role="status" aria-live="polite">
        <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">Alaia</p>
        <div className="alaia-halo alaia-reveal alaia-reveal-2" aria-hidden="true">
          <span className="alaia-halo-ring" />
          <span className="alaia-halo-orbit">
            <span className="alaia-halo-light" />
          </span>
        </div>
        <p className="alaia-loading-text alaia-reveal alaia-reveal-3">
          Cada historia comienza de una forma distinta.
        </p>
        {/* Pausa deliberada antes de la segunda línea (reveal-5, no reveal-4):
            más silencio entre ambas, más cinematográfico. */}
        <p className="alaia-loading-hint alaia-reveal alaia-reveal-5">
          Creo que ya estoy lista para acompañarlos.
        </p>
      </div>
    </div>
  );
}
