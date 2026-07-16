# Design: First Visible Experience — Companion Experience Closure

## Technical Approach

Evolucionar la experiencia existente, sin nueva capa: `useFirstVisibleExperience` obtiene un snapshot efímero antes de llamar al compositor real; `visibleDeliverySession.ts` proyecta receipts verificados a los `processedKeys/history` caller-owned de Companion; `VisibleCompanionExperience` confirma `visible` y `dismissed`. Todo resultado terminal, destino no `in_app` o storage no verificable retorna `null`.

## Architecture Decisions

| Elección | Alternativa | Razón |
|---|---|---|
| Utility feature-local sobre `sessionStorage` | provider, servicio, Memory/backend, `localStorage` | Coincide con navegación y reload de una pestaña sin crear verdad durable. Cross-tab queda explícitamente fuera. |
| Schema cerrado V1 + hash FNV-1a UTF-8 existente | guardar user/trip/copy o crear otro hash | Minimiza keying y no duplica primitivas. Sólo `visibleDeliverySession.ts` importa `editorial/hash`; React/JSX no importa engines. |
| Receipts visibles alimentan Companion | dedupe/frecuencia local | Companion conserva autoridad exclusiva. Pending, silencio y error no cuentan como delivery. |
| Expiry lazy por boundaries existentes | timer, TTL inventado, cron | No agrega regla temporal ni trabajo de fondo. |

## Contracts and Lifecycle

Key: `alaia:visible-delivery:v1:<fnv1a(userId␟tripId)>`. El documento y cada receipt se clonan/congelan y aceptan claves exactas:

```ts
type DeliveryReceiptV1 = Readonly<{
  version: 1; identity: `vdr1_${string}`;
  state: "pending" | "visible" | "dismissed" | "expired";
  destination: "in_app"; dedupeKey: string;
  priority: "high" | "normal" | "low";
  pendingAt: string; processedAt: string | null;
  dismissedAt: string | null; expiresAt: string;
}>;
```

`identity` hashea scope + action id + destination + referencias del intent. No se almacena texto, user/trip separado, payload, PII ni error. `dedupeKey`, prioridad y `processedAt` son los campos mínimos exactos requeridos por Companion.

Transiciones legales: `pending→visible→dismissed`, `pending→expired`, `visible|dismissed→expired`; repetir la misma transición es idempotente, cualquier otra falla cerrada. `processedAt` se fija una sola vez al confirmar visible y sobrevive a `dismissed/expired`. `expiresAt` es el mínimo ISO válido entre `decision.window.validUntil`, `decision.window.expiresAt` y `trip.endDateTime` disponible. Reads/transiciones evalúan expiry; pending expirado se descarta lazy y receipts que fueron visibles conservan evidencia durante la sesión. No hay timers.

Cada acceso inyecta `Storage`, captura getter/get/parse/schema/set/remove/quota y prueba escritura/lectura del namespace. Cualquier fallo devuelve `unavailable`; el hook emite silencio y no compone/renderiza. Registros corruptos o de otra versión se limpian sólo si remover es seguro.

## Data Flow

```text
scope(user,trip) -> read/validate/expire -> Companion snapshot
  -> real composer -> projection pending/in_app
  -> persist pending -> component mount -> onVisible -> persist visible -> render
  -> onDismiss -> persist dismissed -> hide (sin recomponer)
```

Pending no pre-deduplica el primer render. En retorno/reload, visible/dismissed/expired-after-visible aporta su `dedupeKey` a ambos sets y `{dedupeKey,priority,processedAt}` a history; Companion silencia naturalmente. Pending nunca visible puede recomponerse y completar. Callbacks y writes idempotentes hacen determinista el replay de effects. `SettledTripHome` se keyea por user+trip: cambiar scope reinicia hook; volver relee su receipt.

Observabilidad amplía la allowlist actual sólo con `delivery_pending` y `delivery_expired`; `render_success` equivale a visible y `dismiss` a dismissed. Eventos siguen congelados y exactamente `{kind}`.

## Integration and Files

| Archivo | Cambio |
|---|---|
| `features/experience/lib/visibleDeliverySession.ts` | Crear schema, storage guardado, lifecycle, expiry y snapshot Companion. |
| `features/experience/hooks/useFirstVisibleExperience.ts` | Scope fresco, inputs con snapshot, pending y callbacks fail-closed. |
| `features/experience/components/VisibleCompanionExperience.tsx` | Confirmar visible antes de mostrar; dismiss posterior, sin reglas. |
| `features/experience/lib/visibleExperience.ts` | Agregar dos categorías observer; mantener proyección. |
| `features/trips/pages/TripHomePage.tsx` | Key user+trip y cableado de callbacks. |
| Tests focales/boundaries existentes | Extender continuidad y aislamiento. |

No cambia JSX visual, CSS, accesibilidad ni motion: la auditoría no halló defecto. Un receipt suprimido produce cero nodo/animación y restaura el fallback existente.

## Strict TDD and Rollback

Slices RED→GREEN: (1) utility: schema exacto, probe/fallos, scopes, transiciones, expiry e historial; (2) hook/componente: primer render, replay, route/reload, trip/user switch, dismiss sin reinvocación; (3) pipelines reales hoy visible, mañana/último-día silenciosos por sus destinos actuales y Companion silence, más observer/boundaries. Ejecutar focales, suites React/Node, typecheck y diff-check; nunca build.

Rollback: retirar utility/cableado y limpiar únicamente keys `alaia:visible-delivery:v1:*`. Motores, Story, compositor, simulator, router, PWA y persistencia durable permanecen protegidos.
