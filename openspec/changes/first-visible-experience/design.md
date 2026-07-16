# Design: First Visible Experience

## Technical Approach

Materializar el `DeliveryIntent` aprobado en la portada activa sin trasladar autoridad a React. `useFirstVisibleExperience` arma un input autorizado y ejecuta el compositor existente; `toVisibleCompanionExperience` valida el resultado fuera de JSX; el componente recibe solo un view model. La portada espera ese cierre antes de su primer render completo, reutilizando `LoadingScreen`, para evitar inserciones tardías y layout shift.

## Architecture Decisions

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Hook de aplicación en `features/experience/hooks` | Lógica en `TripHomePage` o engines | Aísla el mapeo runtime sin crear autoridad nueva. |
| Proyección pura nullable | Inspeccionar decisiones/intents en JSX | Hace fail-closed testeable y asegura que terminales no produzcan nodos. |
| Slot `ReactNode` en `ActiveTripHome` | Importar Experience desde Trips | Mantiene dirección de dependencias; la página compone features. |
| CSS global en `shell.css` | CSS Module o design system nuevo | La portada ya usa clases globales y tokens de ese archivo. |
| Dismiss en estado local del componente | storage/dominio | Oculta solo el montaje; no afirma dedupe durable. |

## Data Flow

```text
TripHomePage: session + Trip + Story + PushPreferences
  -> useFirstVisibleExperience (un instante lógico; processedKeys/history vacíos)
  -> composeFirstRealExperience (sin cambios)
  -> toVisibleCompanionExperience
       composed + exactamente 1 pending/in_app + referencias exactas -> view model
       cualquier otro caso                                      -> null
  -> ActiveTripHome slot -> VisibleCompanionExperience
```

El hook toma `{trip, user, storyPackage, storyObservedAt}` y captura una sola vez `logicalInstant`. Mapea `livingContext.trip/user/story`, `decision.tripId`, preferencias `enabled/beforeTrip/duringTrip`, `activities: []`, `decision.processedKeys: new Set()`, `companion.preferences.enabled`, `companion.processedKeys: new Set()`, `companion.history: []`, y `memory.scope {ownerUserId:user.id, tripId:trip.id, storyId:storyPackage.storyId}` con `firstChapterAlreadyOpened:false`. `getPushPreferences()` es solo lectura de la preferencia existente; no activa Push. Los conjuntos/historial son caller-owned y vacíos: **no** ofrecen frecuencia ni dedupe durable entre recargas.

El observer recibe objetos congelados con una única clave `kind`, allowlist `flow_started | result_layer | render_success | dismiss | silence`. Emisión: inicio una vez por composición; resultado una vez al resolver; silencio una vez si no hay view model; render una vez al montar; dismiss una vez aunque se active nuevamente. Cada llamada es `try/catch`; nunca incluye texto, IDs, fechas, payloads, PII ni errores.

## Interfaces / Contracts

```ts
type VisibleCompanionExperienceViewModel = Readonly<{
  label: "Alaia";
  text: string;
}>;

toVisibleCompanionExperience(result: FirstRealExperienceResult):
  VisibleCompanionExperienceViewModel | null;
```

La proyección acepta únicamente `outcome === "composed"`, un solo intent con `destination === "in_app"`, `state === "pending"` y referencias exactas `editorial_message,memory_candidate`; usa literalmente `result.message.text`. El componente nunca recibe Trip, Story, motores, preferencias, resultado o intent.

## UI and Accessibility

`ActiveTripHome` coloca el slot dentro de `.active-trip-home-temporal`, después del countdown y antes del CTA; cuando existe reemplaza la segunda línea emocional, y en silencio conserva `active-trip-home-preparations`. Es un `<aside aria-labelledby>` con `<h3>Alaia</h3>`, texto literal y botón `aria-label="Cerrar mensaje de Alaia"`; decoración `aria-hidden`, sin `role="alert"` ni `aria-live`.

En `shell.css`: ancho `min(100%, 30rem)`, `min-width:0`, padding con `clamp()`, filete `rgba(var(--gold-rgb), ...)`, serif `var(--font-display)`, texto `var(--ivory)`/`--secondary-rgb`, cierre 44×44 y `:focus-visible` con `--focus-ring`. Sin card, sombra, ancho fijo ni overflow. Desktop/tablet/mobile permanecen en flujo; entrada solo `opacity/translateY(0.25rem)` bajo `prefers-reduced-motion:no-preference`; `reduce` fuerza `animation:none` sin cambiar geometría.

## File Changes

| Archivo | Acción |
|---|---|
| `features/experience/lib/visibleExperience.ts` | Crear proyección y observer seguro |
| `features/experience/hooks/useFirstVisibleExperience.ts` | Crear mapeo/composición fail-closed |
| `features/experience/components/VisibleCompanionExperience.tsx` | Crear presentación y dismiss local |
| `features/trips/pages/TripHomePage.tsx` | Montar hook y slot |
| `features/trips/components/ActiveTripHome.tsx` | Añadir slot in-flow |
| `styles/shell.css` | Añadir estilos responsive/motion |
| Tests focales junto a esos módulos | Crear/modificar |

## Testing Strategy

Strict TDD: (1) proyección cubre éxito, todos los terminales, intent ausente/múltiple/no soportado/mismatch y copy literal; (2) React cubre render, silencio, dismiss único, observer hostil, semántica, foco, ausencia de alert/live-region y no mutación; (3) `ActiveTripHome` prueba placement/fallback y `TripHomePage` pipeline real, inputs vacíos y cero bypass; (4) test CSS prueba fluidez, 640px, foco y reduced motion; boundaries prohíben simulador, delivery, storage, red adicional, Story rules y cambios a engines. Ejecutar focales, `npm run test:react`, `npm run test`, typecheck y protected-range/diff; nunca build.

## Review Slices / Rollout

1. Proyección + componente + tests de accesibilidad.
2. Hook + integración + CSS + boundaries/tests.

Sin migración, flag ni persistencia. Rollback elimina montaje y archivos nuevos. No hay preguntas abiertas.
