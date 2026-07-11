import { useRouteError } from "react-router-dom";

// Frontera de error de las rutas (errorElement de la ruta raíz). Sin esto, un
// throw en render —p. ej. un paquete de historia inválido o un modo desconocido—
// dejaría la pantalla en blanco sin salida. Copy humana, no técnica; misma paleta
// que el umbral. El detalle real va a la consola para diagnóstico, nunca a la UI.
export function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV) {
    console.error("Route error:", error);
  }

  return (
    <div className="aurora-entrance">
      <div className="aurora-entrance-content">
        <p className="aurora-eyebrow">Alaia</p>
        <h1 className="aurora-entrance-title">Algo se interrumpió.</h1>
        <p className="aurora-entrance-text">
          Volvé a intentar en un momento — tus recuerdos siguen guardados.
        </p>
        <form
          className="aurora-entrance-form"
          onSubmit={(event) => {
            event.preventDefault();
            window.location.reload();
          }}
        >
          <button type="submit">Reintentar →</button>
        </form>
      </div>
    </div>
  );
}
