import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

interface MemoryLightboxProps {
  /** URLs ya resueltas (nunca ids sin blob). La que abre el visor la marca `initialIndex`. */
  photos: string[];
  initialIndex: number;
  onClose: () => void;
  /** Disponible solo desde el gesto editorial de edición; nunca en el visor normal. */
  onRemove?: (index: number) => void;
  onMovePrevious?: (index: number) => void;
  onMoveNext?: (index: number) => void;
  onUseAsHero?: (index: number) => void;
}

// Visor accesible de una foto guardada: imagen grande, navegación anterior/
// siguiente, contador, cierre por botón/Escape/clic fuera, contención y
// restauración de foco, teclado y reduced motion (vía CSS). Se monta solo
// mientras está abierto; al desmontar restaura el foco al disparador.
export function MemoryLightbox({
  photos,
  initialIndex,
  onClose,
  onRemove,
  onMovePrevious,
  onMoveNext,
  onUseAsHero,
}: MemoryLightboxProps) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(photos.length - 1, 0)),
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const total = photos.length;

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);
  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  // Contención + restauración de foco: guarda quién tenía el foco al abrir,
  // enfoca el visor, y lo devuelve al cerrar (la miniatura que lo abrió).
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Teclado del visor: Escape cierra, flechas navegan, Tab queda atrapado dentro.
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === dialogRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, goPrev, goNext],
  );

  if (total === 0) return null;
  const current = photos[index];

  return (
    <div
      className="memory-lightbox-backdrop"
      // Clic fuera de la figura cierra el visor.
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="memory-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Foto del recuerdo, en grande"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        // Evita que el clic sobre el contenido cierre el visor.
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="memory-lightbox-close"
          aria-label="Cerrar el visor"
          onClick={onClose}
        >
          Cerrar
        </button>
        <figure className="memory-lightbox-figure">
          <img className="memory-lightbox-image" src={current} alt="" />
          {total > 1 ? (
            <figcaption className="memory-lightbox-counter" aria-live="polite">
              {index + 1} / {total}
            </figcaption>
          ) : null}
        </figure>
        {total > 1 ? (
          <div className="memory-lightbox-nav">
            <button
              type="button"
              className="memory-lightbox-prev"
              aria-label="Foto anterior"
              onClick={goPrev}
            >
              Anterior
            </button>
            <button
              type="button"
              className="memory-lightbox-next"
              aria-label="Foto siguiente"
              onClick={goNext}
            >
              Siguiente
            </button>
          </div>
        ) : null}
        {onRemove || onMovePrevious || onMoveNext || onUseAsHero ? (
          <div className="memory-lightbox-manage" aria-label="Ordenar las fotografías">
            {onUseAsHero ? (
              <button
                type="button"
                className="memory-lightbox-manage-action"
                aria-label="Usar esta foto como principal"
                title="Usar como principal"
                disabled={index === 0}
                onClick={() => {
                  onUseAsHero(index);
                  setIndex(0);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z" /></svg>
              </button>
            ) : null}
            {onMovePrevious ? (
              <button
                type="button"
                className="memory-lightbox-manage-action"
                aria-label="Mover esta foto antes"
                title="Mover antes"
                disabled={index === 0}
                onClick={() => {
                  onMovePrevious(index);
                  setIndex((currentIndex) => Math.max(0, currentIndex - 1));
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5l-7 7 7 7" /></svg>
              </button>
            ) : null}
            {onMoveNext ? (
              <button
                type="button"
                className="memory-lightbox-manage-action"
                aria-label="Mover esta foto después"
                title="Mover después"
                disabled={index === total - 1}
                onClick={() => {
                  onMoveNext(index);
                  setIndex((currentIndex) => Math.min(total - 1, currentIndex + 1));
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5l7 7-7 7" /></svg>
              </button>
            ) : null}
            {onRemove ? (
              <button
                type="button"
                className="memory-lightbox-manage-action memory-lightbox-remove"
                aria-label="Eliminar esta foto"
                title="Eliminar esta foto"
                onClick={() => {
                  onRemove(index);
                  onClose();
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
