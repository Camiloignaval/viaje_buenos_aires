# Proposal: First Visible Experience — Companion Experience Closure

## Intent

**Hoy:** la experiencia representa correctamente un `DeliveryIntent pending/in_app`, pero cada montaje reinicia historial y dismiss; navegación o recarga pueden reevaluar la acción.

**Propuesto:** cerrar la continuidad de esa misma capacidad con receipts efímeros de sesión que alimenten las reglas existentes de dedupe y frecuencia de Companion, sin crear dominio, persistencia durable ni nueva arquitectura.

## Scope

### In Scope

- Utility feature-local sobre `sessionStorage`, defensiva e inyectable, con lifecycle `pending → visible → dismissed → expired`.
- Records allowlist por usuario, viaje y acción/intent; sólo claves opacas mínimas, categorías y expiración derivada de tiempos existentes.
- Proyección de receipts a `processedKeys` e historial caller-owned; snapshot fresco por usuario+viaje.
- Silencio fail-closed ante storage inválido y continuidad en navegación, recarga y cambio de scope.
- Fixtures reales: hoy visible; mañana, último día y Companion silence sin UI según destinos y reglas vigentes.

### Out of Scope

- `localStorage`, IndexedDB, backend, Memory, Timeline o persistencia remota.
- Push, Web Push, email, SMS, IA, providers, nuevas reglas/canales, engines o Story.
- Rediseño visual sin evidencia o dismiss como decisión de dominio.

## Capabilities

### New Capabilities

- `first-visible-experience`: continuidad efímera de delivery dentro de la capacidad ya propuesta.

### Modified Capabilities

None. Los motores y `first-real-experience` conservan sus contratos.

## Approach

`visibleDeliverySession.ts` valida receipts en `sessionStorage`. El hook entrega historial/keys a Companion y registra transiciones. El componente sólo notifica visible/dismiss. `TripHomePage` fija identidad por usuario+viaje. Storage inválido produce silencio, nunca fallback en memoria.

## Affected Areas

| Área | Impacto | Descripción |
|---|---|---|
| `features/experience/lib/visibleDeliverySession.ts` | Nuevo | Receipt, lifecycle, expiry y proyección |
| `features/experience/hooks/useFirstVisibleExperience.ts` | Modificado | Continuidad fail-closed |
| `features/experience/components/VisibleCompanionExperience.tsx` | Modificado | Callbacks visuales |
| `features/trips/pages/TripHomePage.tsx` | Modificado | Scope usuario+viaje |
| Tests del change | Modificado | Continuidad, destinos y boundaries |

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Storage bloqueado/corrupto | Media | Silencio fail-closed |
| Leakage entre scopes | Baja | Snapshot y key por usuario+viaje |
| Duplicar reglas | Media | Proyectar a Companion; no decidir localmente |

## Rollback Plan

Retirar utility y cableado; limpiar sólo keys namespaced. Sin migraciones ni cambios de motores.

## Dependencies

- `sessionStorage` existente y contratos verificados de Companion/DeliveryIntent.

## Success Criteria

- [ ] Dismiss y receipt visible evitan repetición durante sesión y recarga mediante reglas Companion.
- [ ] Expiry restaura elegibilidad; cambio de usuario/viaje no filtra estado.
- [ ] Hoy es visible; mañana, último día y silencio producen cero UI autorizada.
- [ ] No se almacena copy, PII, payload, error ni dato de dominio.
