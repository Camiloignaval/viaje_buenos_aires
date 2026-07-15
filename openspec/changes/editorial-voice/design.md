# Design: Editorial Voice

## Enfoque técnico

Subdominio TypeScript puro `app/src/features/context-engine/editorial/`: recibe exclusivamente `CompanionAction` y catálogo, valida en modo cerrado, elige una variante curada mediante hash estable y devuelve un mensaje; todo fallo lanza `EditorialContractError`. No consulta contexto, no decide, no hace I/O y no autoriza delivery.

```text
CompanionAction -> validación -> catálogo editorial-v1 -> selección FNV-1a -> clon/freeze -> EditorialMessage
                         \-----------------------------------------------> throw EditorialContractError
```

## Decisiones de arquitectura

| Opción | Tradeoff | Decisión y motivo |
|---|---|---|
| Catálogo por `DecisionKind` | Menos variedad automática | Elegido: conserva significado y permite revisión exhaustiva; no hay fallback entre kinds. |
| Plantillas por canal | Optimiza superficies inexistentes | Rechazada: `channel` es clasificación conceptual, no transporte. |
| Catálogo sin placeholders | Sin personalización | Elegido para v1: `CompanionAction` no aporta nombres legibles; evita inferencias desde IDs. |
| Error tipado lanzado | El caller debe capturarlo | Elegido: falla cerrado con código preciso, sin salida parcial, fallback, silencio nuevo ni decisión alternativa. |

## Contratos exactos

```ts
type EditorialLocale = "es-CL";
type EditorialCatalogVersion = "editorial-v1";
type EditorialVariantId = "tomorrow-01" | "tomorrow-02" | "today-01" | "today-02" |
  "last-day-01" | "last-day-02" | "weather-01" | "weather-02" | "light-01" | "light-02";
type EditorialErrorCode = "INVALID_ACTION" | "UNSUPPORTED_KIND" | "INVALID_CHANNEL" |
  "INVALID_CATALOG" | "INVALID_LOCALE" | "MISSING_KIND" | "DUPLICATE_VARIANT_ID" |
  "INVALID_TEXT" | "TEXT_TOO_LONG" | "FORBIDDEN_TEXT" | "PLACEHOLDER_NOT_ALLOWED";

interface EditorialActionRef {
  readonly actionId: string; readonly decisionId: string; readonly kind: DecisionKind;
}
interface EditorialMessage {
  readonly locale: EditorialLocale; readonly catalogVersion: EditorialCatalogVersion;
  readonly variantId: EditorialVariantId; readonly text: string;
  readonly actionRef: EditorialActionRef; readonly channel: CompanionChannel;
}
class EditorialContractError extends Error {
  readonly name = "EditorialContractError";
  constructor(readonly code: EditorialErrorCode) { super(code); }
}
interface EditorialVariant { readonly id: EditorialVariantId; readonly text: string }
interface EditorialCatalog {
  readonly version: EditorialCatalogVersion; readonly locale: EditorialLocale;
  readonly entries: Readonly<Record<DecisionKind, readonly EditorialVariant[]>>;
}
type EditorialObserver = (event: Readonly<{ outcome: "success" | "error";
  errorCode: EditorialErrorCode | "none"; kind: DecisionKind | "unknown";
  variantId: EditorialVariantId | "none"; catalogVersion: EditorialCatalogVersion;
  durationMs: number }>) => void;
interface EditorialDependencies { readonly observer?: EditorialObserver; readonly timingNow?: () => number }
declare function createEditorialMessage(action: CompanionAction,
  catalog?: EditorialCatalog, dependencies?: EditorialDependencies): EditorialMessage;
```

IDs internos sólo aparecen en `actionRef` y seeds; jamás en `text` ni observer. La implementación clona campos permitidos, congela recursivamente objetos y nunca muta input/catálogo. Observer y timing son inyectados, categóricos, sanitizados a `0..60000 ms` y best-effort; si el observer falla se conserva el mensaje o el `EditorialContractError` original.

## Catálogo congelado

```text
trip_start_tomorrow: tomorrow-01 "Mañana comienza este viaje."
                     tomorrow-02 "Falta poco: el viaje empieza mañana."
trip_start_today:    today-01 "Hoy comienza una nueva historia."
                     today-02 "El viaje empieza hoy, a su propio ritmo."
trip_last_day:       last-day-01 "Hoy es el último día de este viaje."
                     last-day-02 "Este viaje llega hoy a su último día."
weather_attention_candidate: weather-01 "Quizás sea un buen momento para considerar el clima."
                             weather-02 "El clima puede ser relevante para este momento del viaje."
light_moment_candidate: light-01 "Puede ser un buen momento para disfrutar la luz natural."
                        light-02 "La luz natural acompaña este momento del viaje."
```

`EDITORIAL_V1_PLACEHOLDERS = [] as const`; cualquier `{...}` es inválido. Variante: UTF-8 FNV-1a 32-bit sobre `catalogVersion + "\u001f" + actionId` (`2166136261`, XOR por byte, `Math.imul(hash, 16777619) >>> 0`), índice `hash % variants.length`. La versión integra así la identidad editorial sin emitir el seed. Sin random, reloj o estado.

## Validación y archivos

Orden/código exacto: acción/lineage `INVALID_ACTION` -> kind `UNSUPPORTED_KIND` -> channel `INVALID_CHANNEL` -> forma/versión `INVALID_CATALOG` -> locale `INVALID_LOCALE` -> kind faltante `MISSING_KIND` -> ID repetido `DUPLICATE_VARIANT_ID` -> placeholders `PLACEHOLDER_NOT_ALLOWED` -> vacío/forma `INVALID_TEXT` -> longitud `TEXT_TOO_LONG` -> tono `FORBIDDEN_TEXT`. Texto: NFC, trim, una línea, espacios simples, 1–160 code points (`Array.from`), máximo dos oraciones; nunca truncar. Para lenguaje prohibido: NFD, quitar `\p{M}`, lowercase y comparar frases/stems por límites Unicode. Rechazar `debes`, `no olvides`, `tienes que`, `urgente`, `importante`, `alerta`, voseo, imperativos directos, lenguaje de sistema/delivery, `!`, markup, emoji, mayúsculas sostenidas y puntuación repetida.

Crear `contracts.ts`, `catalog.ts`, `validation.ts`, `hash.ts`, `editorialVoice.ts`, `observer.ts`, `index.ts`; tests homónimos más `boundaries.test.ts`. Probar fixtures exactos, cinco kinds, determinismo, variación, Unicode 160/161, throws/códigos por etapa, freeze/no mutación, preservación del error ante fallo del observer y análisis estático que prohíba imports de contexto, Story, providers, Decision Engine runtime, React, UI, Push, delivery, storage, IA, prompts y Companion legacy.

## Rollout

Sin migración, consumidor, flag ni integración. Rollback: eliminar sólo el directorio nuevo. Archive: Foundation -> Weather -> Decision Engine -> Companion Orchestrator -> Editorial Voice. No archivar aquí ni avanzar a 7.6. Preguntas abiertas: ninguna.
