// La escena vacía: el umbral de un libro sin escribir. "Crear viaje" es lo único
// que importa acá — copy idéntica a renderTripsEmptyScene().
export function TripsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="trips-empty">
      <p className="trips-empty-text alaia-reveal alaia-reveal-3">
        Todavía no empezaste ningún viaje. Cuando lo hagas, va a abrirse acá como
        el primer capítulo.
      </p>
      <button
        type="button"
        className="trips-create-link trips-create-link-primary alaia-reveal alaia-reveal-4"
        onClick={onCreate}
      >
        Crear viaje →
      </button>
    </div>
  );
}
