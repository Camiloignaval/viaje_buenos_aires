## Exploration: Editorial Voice

### Current State

#### Fuente de verdad y frontera disponible

`app/src/features/context-engine/companion/contracts.ts` define el único input autorizado. `CompanionAction` contiene `outcome: "action"`, `actionId`, el `ActDecision` completo clonado, `channel`, `policy`, `reason`, `decisionRef` y `evaluatedGates`. El `ActDecision` aporta únicamente datos estructurados: `kind`, categoría, prioridad, evidencia/freshness categóricas, capabilities/módulos, ventana, `dedupeKey` y un payload de enums (`attentionSignal`, `temporalState`, `activityCandidate`). Los cinco `DecisionKind` actuales son `trip_start_tomorrow`, `trip_start_today`, `trip_last_day`, `weather_attention_candidate` y `light_moment_candidate`.

No existen en `CompanionAction` campos editoriales para ciudad, nombre del viaje, viajeros, capítulo, lugar, clima legible, temperatura, amanecer/atardecer o nombre de actividad. Aunque `actionId`, `decisionRef.id` y `dedupeKey` codifican identidad semántica, hoy incluyen internamente `tripId` y, en Weather/Light, `activityId`; no deben parsearse para inventar placeholders ni exponerse como copy. `channel` es sólo un label conceptual verificado, no autorización de delivery.

`app/src/features/context-engine/companion/orchestrator.ts` valida y preserva la decisión, pero Editorial Voice no debe repetir esa validación para decidir si corresponde actuar: recibe exclusivamente una `CompanionAction` ya emitida. Sí necesita una guarda runtime cerrada para callers JS o valores malformados, sin consultar contexto ni promover alternativas.

#### Copy y tono existente

- `app/lib/companionEngine.js` mezcla reglas legacy con cinco frases breves: “Mañana comienza una historia nueva.”, “Hoy comienza el viaje.”, “Hoy todavía queda una página por escribir.” y dos frases post-viaje. Es referencia de continuidad, no dependencia: importarlo arrastraría reglas, rutas y runtime Node.
- `app/src/features/personal/lib/personalMessage.ts` usa frases cálidas, contemplativas y no urgentes (“La historia está ocurriendo ahora. Que el día encuentre su propio ritmo.”), pero también decide estado temporal; Editorial Voice no debe importarlo ni duplicar ese motor.
- Experience y el Story Package usan el viaje como libro: “Hoy comienza.”, “Todo empieza aquí.”, “Un nuevo capítulo se acerca.” y “Este no es solo un viaje. Es un recuerdo que comenzamos a escribir juntos.” Ese registro es coherente, pero `story-ba2026.json` contiene copy íntimo y personalizado; no es un catálogo reutilizable para mensajes genéricos.
- El repositorio no tiene un framework i18n general. `localeCatalog.ts` construye locales desde el destino y el Story declara `language: "es"`, pero Editorial Voice no puede leer ninguno porque su único input es `CompanionAction`. Para v1 el locale debe quedar explícitamente fijado a `es-CL`: español neutro, natural para Chile, sin voseo ni modismos marcados.
- Existen superficies con voseo (“Alaia mejora con vos”) y copy operativo/imperativo. Por eso no se puede inferir automáticamente la voz desde todo `app/src`; el catálogo necesita reglas propias y revisión editorial.

No hay una utilidad de sanitización textual de dominio reutilizable. `app/lib/platformFeedback.js` tiene un `cleanText` privado de backend que convierte y corta input arbitrario; los demás `maxLength` son límites de formularios. No existe truncador Unicode, interpolador seguro ni tests de tono. Cortar una frase luego de renderizar podría alterar su sentido; el límite debe validarse y fallar cerrado, no truncar.

#### Dependencias OpenSpec

Los cuatro cambios previos están activos, verificados y `ready-for-archive`: `living-context-foundation` → `living-context-weather` → `context-decision-engine` → `companion-orchestrator`. Editorial Voice depende sólo del último contrato y debe agregarse después en el orden de archive. Ninguno debe modificarse ni archivarse en esta etapa.

### Affected Areas

- `app/src/features/context-engine/companion/contracts.ts` — fuente tipada de `CompanionAction`; se consume sin modificar.
- `app/src/features/context-engine/decision/contracts.ts` — define los cinco kinds y el payload realmente disponible; no se modifica ni reinterpreta.
- `app/lib/companionEngine.js` — copy legacy de referencia, nunca import ni integración.
- `app/src/features/personal/lib/personalMessage.ts` — evidencia de tono, pero combina copy con decisión y queda fuera del dependency graph.
- `app/src/features/experience/lib/format.ts` y `app/src/story/data/story-ba2026.json` — patrones editoriales existentes; no son catálogo ni fuente runtime.
- Propuesto: `app/src/features/context-engine/editorial/` — contratos, catálogo versionado, selector/renderer determinista, validadores y tests puros.
- `openspec/changes/{living-context-foundation,living-context-weather,context-decision-engine,companion-orchestrator}/` — dependencias activas y orden obligatorio.

### Approaches

1. **Catálogo versionado por `DecisionKind`** — cada uno de los cinco kinds tiene variantes fijas curadas y un selector determinista.
   - Pros: semántica auditable; exhaustividad de tipos; tests claros; evita condicionar la voz por canal; sumar copy no cambia decisiones.
   - Cons: requiere revisión editorial manual; un catálogo pequeño puede sentirse repetitivo.
   - Effort: Low.

2. **Plantillas por canal** — `push`, `in_app`, `timeline`, `memory` y `editorial` definen su propio copy.
   - Pros: permitiría optimizar longitud/formato por superficie futura.
   - Cons: hoy los canales no son delivery ni superficies; mezcla expresión con transporte, puede cambiar el significado de un mismo kind y anticipa requisitos inexistentes.
   - Effort: Medium.

3. **Constructor genérico de oraciones** — combinar aperturas, verbos y cierres según payload, prioridad o evidencia.
   - Pros: muchas combinaciones con poco catálogo aparente.
   - Cons: genera frases no revisadas, deriva hacia generación pseudo-probabilística, dificulta garantizar tono/gramática y puede inventar precisión que el action no contiene.
   - Effort: High.

### Recommendation

Implementar la opción 1 como un módulo TypeScript puro y determinista: `createEditorialMessage(action: CompanionAction): EditorialMessage`. No imports de Living Context, Weather, Story, Experience, providers, React, storage, Push o delivery; no reloj ni I/O.

Contrato recomendado, explícito y fail-closed:

```ts
type EditorialUnavailableReason =
  | "malformed_action"
  | "unsupported_kind"
  | "invalid_catalog_entry";

type EditorialMessage =
  | Readonly<{
      outcome: "message";
      text: string;
      locale: "es-CL";
      catalogVersion: "editorial-v1";
      variantId: string;
      actionRef: Readonly<{
        actionId: CompanionAction["actionId"];
        decisionId: CompanionAction["decisionRef"]["id"];
        kind: CompanionAction["decisionRef"]["kind"];
        channel: CompanionAction["channel"];
      }>;
    }>
  | Readonly<{
      outcome: "unavailable";
      reason: EditorialUnavailableReason;
      actionRef: null | Readonly<{
        actionId: string;
        decisionId: string;
        kind: string;
        channel: string;
      }>;
    }>;
```

La rama `unavailable` es preferible a lanzar: mantiene el contrato determinista, permite silencio explícito ante input runtime inválido y no transforma una falla editorial en autorización de fallback. El resultado preserva referencias de acción/decisión/canal, pero no es un payload Push, no contiene rutas y no autoriza render ni envío. El objeto debe clonarse/freeze defensivamente como los subdominios anteriores.

#### Catálogo y variación congelados

- Catálogo `editorial-v1` indexado exhaustivamente por los cinco `DecisionKind`, con al menos dos variantes curadas por kind y `variantId` estable. No hay fallback genérico entre kinds.
- La selección usa un hash síncrono, estable y documentado de `catalogVersion + action.actionId`; nunca `Math.random`, fecha, orden de ejecución o estado global. El seed se usa sólo en memoria para calcular `hash % variants.length` y nunca se emite, persiste u observa.
- Realidad de seguridad: el contrato no expone una identidad única estable separada de `tripId`/`activityId`. Por eso `actionId` se trata como identidad opaca: no se parsea ni interpola, y sólo se devuelve dentro de `actionRef` porque el mandato exige trazabilidad. Si en el futuro se exige que ni esa referencia circule, Companion deberá proveer una clave editorial opaca; Editorial Voice no debe fabricarla consultando contexto.
- Cambiar variantes existentes requiere incrementar `catalogVersion`; agregar/reordenar copy bajo la misma versión alteraría la reproducibilidad histórica.

#### Tono, longitud y validación exactos

El catálogo se valida como dato antes de renderizar y los tests aplican la misma función a todas las entradas:

1. Texto Unicode normalizado con `NFC`, `trim`, una sola línea y espacios internos simples.
2. Longitud entre 1 y **160 code points Unicode** (`Array.from(text).length`), máximo dos oraciones. No truncar; una entrada excedida es inválida.
3. Rechazar `!`, `¡`, saltos de línea, HTML/Markdown, emojis, MAYÚSCULAS sostenidas y puntuación repetida (`??`, `..`, `— —`).
4. Rechazar, sin distinguir mayúsculas/acentos y por límites de palabra: `debes`, `no olvides`, `tienes que`, `urgente`, `importante`, `alerta`; voseo/pronominales `vos`, `tenés`, `podés`, `querés`, `mirá`, `vení`, `andá`, `recordá`, `hacé`; y lenguaje de sistema `asistente`, `chatbot`, `notificación`, `sistema automático`.
5. Rechazar imperativos directos frecuentes (`haz`, `ve`, `mira`, `recuerda`, `prepárate`, `lleva`, `revisa`). La calidez/elegancia no es demostrable con regex: cada frase además debe pasar revisión editorial y snapshot/fixture explícito.

Estas reglas protegen los mínimos objetivos sin fingir un clasificador semántico. Las frases deben invitar o describir; prioridad `high` no habilita urgencia, dramatismo ni órdenes.

#### Placeholders congelados

El catálogo v1 debe usar **cero placeholders dinámicos**. Ciudad, viaje, capítulo y nombres no existen como campos legibles en `CompanionAction`; extraerlos de IDs, Story o contexto sería una dependencia oculta. El validador debe rechazar cualquier token `{...}` en v1. Una futura versión sólo podrá agregar claves tipadas a una allowlist si provienen de nuevos campos estructurados explícitos del action; el normalizador deberá aceptar strings ya curados bajo un contrato específico, aplicar NFC/espacios/límite/caracteres permitidos y omitir o rechazar texto libre, nunca interpolarlo ni escapar “lo suficiente”.

#### Tests necesarios

- Exhaustividad exacta de los cinco kinds, incluido `trip_start_tomorrow`, y `unsupported_kind` para runtime desconocido.
- Misma acción + misma versión → mismo `variantId/text`; identidades distintas alcanzan variantes conocidas; sin `Math.random`, clock o estado.
- Todas las variantes pasan locale, longitud Unicode, una línea, oraciones, forbidden language, voseo, imperativos, markup/puntuación y placeholder-free v1.
- Input malformado y entrada de catálogo inválida fallan cerrado sin fallback ni throw.
- Preservación exacta de `actionId`, decision ID, kind y channel; ninguna mutación del input y output frozen.
- Tests de frontera/imports prueban ausencia de contexto, Weather, Story, Experience, providers, storage, React, Push, delivery, IA, prompts y legacy Companion.
- Tabla explícita de fixtures editoriales para evitar tests tautológicos; revisar cambios de copy como contenido de producto, no actualizar snapshots a ciegas.

#### What NOT to Implement

- IA, LLM, prompts, generación libre/probabilística, `Math.random` o combinadores de frases.
- Decisiones, prioridades, frecuencia, dedupe, canales, preferencias, consultas de contexto o reevaluación de Companion.
- Lecturas de Story/Experience, Trip, Weather, providers, endpoints, red, storage o configuración.
- Ciudad/viaje/capítulo/nombres inferidos desde IDs o texto libre; sanitización permisiva que termine interpolando datos no confiables.
- UI, render, Push payload, notificaciones, rutas o autorización de delivery.
- Cambios en Foundation, Weather, Decision Engine, Companion Orchestrator o Companion legacy.
- Archive, push, tags o avance a Etapa 7.6.

### Risks

- **Tests de tono frágiles**: regex demasiado amplias pueden bloquear frases válidas; separar invariantes mecánicas de revisión editorial humana.
- **Dependencia oculta de contexto**: querer personalizar ciudad/viaje/capítulo incentiva parsear IDs o importar Story; v1 debe permanecer sin placeholders.
- **Inestabilidad pseudoaleatoria**: reordenar variantes cambia el módulo del hash; versionar catálogo y congelar orden/IDs.
- **Copy repetitivo**: pocas variantes son honestas pero pueden repetirse; ampliar sólo con frases curadas y nueva versión cuando corresponda.
- **Drift de español**: el repositorio mezcla neutro, voseo y contenido íntimo; Editorial Voice necesita catálogo `es-CL` autónomo y pruebas de vocabulario.
- **Interpolación insegura**: limpiar texto libre no lo vuelve editorialmente verdadero; rechazar/omitir es más seguro que escapar.
- **Mensaje confundido con delivery**: `channel` en `actionRef` es trazabilidad, no formato ni permiso de envío.
- **Identidad sensible**: `actionId` incorpora IDs internos; usarlo sólo como seed opaco y referencia exigida, nunca como copy, métrica o log.

### Ready for Proposal

Yes. La propuesta debe congelar catálogo `editorial-v1` por los cinco kinds, resultado discriminado fail-closed, selección reproducible por identidad opaca/versionada, límite de 160 code points, validadores mecánicos exactos y v1 sin placeholders. Debe conservar el orden de dependencia/archivo Foundation → Weather → Decision → Orchestrator → Editorial y planificar contratos, catálogo/validadores y pruebas como work units reviewables.
