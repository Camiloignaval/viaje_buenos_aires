# Proposal: First Visible Experience

## Intent

**Hoy:** `first-real-experience` compone el acompañamiento completo y emite un `DeliveryIntent`, pero ninguna superficie productiva lo representa.

**Propuesto:** mostrar el primer momento real de Alaia dentro de la portada del viaje activo (`/trips/:tripId`), sin trasladar autoridad a la UI ni crear otra capa.

## Scope

### In Scope

- Proyección fail-closed de un resultado compuesto: sólo `composed` con un único intent `pending/in_app` produce un view model.
- Adaptador de aplicación que reúne inputs autorizados e invoca el compositor.
- Momento editorial en `ActiveTripHome`, responsive, WCAG AA, no modal ni live region.
- Dismiss visual local y observación best-effort categórica.

### Out of Scope

- Push, timeline, email, SMS, persistencia, dedupe durable o delivery real.
- Motores, reglas, providers, Story Package, IA o llamadas del componente a capas inferiores.
- Convertir dismiss en evento de Memory, Decision o Companion.

## Capabilities

### New Capabilities

- `first-visible-experience`: representación segura del `DeliveryIntent in_app` aprobado en la portada activa.

### Modified Capabilities

None. `first-real-experience` y los motores conservan requisitos.

## Approach

`TripHomePage` aporta inputs a un hook que invoca `composeFirstRealExperience`. Una proyección pura acepta sólo resultado e intent autorizados. `AlaiaCompanionMoment` recibe texto editorial y estado visual, sin reconstruir decisiones. Todo terminal, silencio, contrato inválido o intent no representable renderiza nada.

`processedKeys` e historial Companion nacen vacíos: no existe fuente productiva autorizada. No prometen frecuencia ni dedupe entre recargas y no se simularán con storage. El observer admite sólo `flow_started`, `result_layer`, `render_success`, `dismiss` y `silence`, sin copy, IDs, PII, payloads ni errores crudos.

## Affected Areas

| Área | Impacto | Descripción |
|---|---|---|
| `app/src/features/experience/{lib,hooks,components}/` | Nuevo | Proyección, hook y presentación |
| `app/src/features/trips/pages/TripHomePage.tsx` | Modificado | Inputs y montaje |
| `app/src/features/trips/components/ActiveTripHome.tsx` | Modificado | Ubicación antes del CTA |
| `app/src/styles/shell.css` | Modificado | Tokens, foco y responsive |

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Repetición tras recarga | Alta | Declarar límite; no inventar persistencia |
| UI duplica autoridad | Media | View model mínimo y tests de boundaries |
| Ruido o layout shift | Baja | Sin placeholder, modal, live region ni animación de altura |

## Rollback Plan

Retirar montaje, hook, proyección, componente y estilos nuevos. No hay migraciones, datos ni cambios de motores que revertir.

## Dependencies

- `composeFirstRealExperience`, preferencias actuales y portada activa verificadas.

## Success Criteria

- [ ] El caso exitoso muestra literalmente `EditorialMessage.text` sólo para un intent `pending/in_app`.
- [ ] Todos los terminales e intents inválidos producen cero nodos visibles.
- [ ] Dismiss sólo oculta el momento durante el montaje.
- [ ] Tests cubren pipeline real, accesibilidad, observer hostil, responsive, reduced motion y límites de imports.
