// Estado y validación del formulario "Crear viaje". Los mensajes reflejan los
// mismos campos mínimos que exige la API (ver lib/platformTrips.js
// normalizeTripInput) sin duplicar esa lógica: esto es solo feedback
// inmediato — el server sigue siendo la fuente de verdad, y createTrip()
// (tripStore.js) propaga cualquier error que el server igual devuelva.

export function validateTripInput({ title, destination }) {
  const errors = {};
  if (!title || !title.trim()) {
    errors.title = 'El viaje necesita un título.';
  }
  if (!destination || !destination.trim()) {
    errors.destination = 'El viaje necesita un destino.';
  }
  return errors;
}

function initialFormState() {
  return { open: false, title: '', destination: '', errors: {}, submitting: false, submitError: null };
}

/** Factory del estado del formulario — inyecta un tripStore (real o fake) para poder testear sin red. */
export function createTripFormController(trips) {
  let state = initialFormState();
  const listeners = new Set();

  function setState(next) {
    state = next;
    listeners.forEach((listener) => listener(state));
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function open() {
    setState({ ...initialFormState(), open: true });
  }

  function cancel() {
    setState(initialFormState());
  }

  /** Valida, y si pasa, crea el viaje (tripStore.createTrip refresca la lista solo). Cierra el form al éxito. */
  async function submit({ title = '', destination = '' } = {}) {
    const errors = validateTripInput({ title, destination });
    if (Object.keys(errors).length > 0) {
      setState({ ...state, title, destination, errors, submitError: null });
      return null;
    }

    setState({ ...state, title, destination, errors: {}, submitting: true, submitError: null });
    try {
      const trip = await trips.createTrip({ title: title.trim(), destination: destination.trim() });
      setState(initialFormState());
      return trip;
    } catch (error) {
      setState({ ...state, submitting: false, submitError: error.message ?? 'No se pudo crear el viaje.' });
      return null;
    }
  }

  return { getState, subscribe, open, cancel, submit };
}
