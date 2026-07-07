# TECHNICAL_ARCHITECTURE.md

**Autor:** Lead Software Architect
**Alcance:** Arquitectura técnica objetivo para implementar los dominios de `DOMAIN_MODEL.md` sobre el proyecto existente.
**Estado:** Diseño — sin código, sin modificaciones al repositorio. Referencia archivos actuales solo para indicar reutilización/evolución, no como plan de refactor inmediato.

---

## 0. Punto de partida (qué reutilizamos y qué no)

Según `CURRENT_PROJECT_ANALYSIS.md`, hoy existen dos activos técnicos con calidad muy distinta:

- **Reutilizable:** `app/src/storage.js` + `app/api/*.js` + `app/lib/mongodb.js`. La idea de "localStorage primero, backend después, con fallback automático" ya está resuelta y funciona. Es la base real de Synchronization y Media Storage — no se reescribe desde cero, se **reorganiza y se le quita la mezcla de responsabilidades** que hoy tiene (persistencia + upload + auth en el mismo archivo).
- **No reutilizable como base, sí como referencia de contenido:** `app/src/data.js` y el `index.html` de la raíz. Su contenido (checklist, fotos, videos de Buenos Aires) es exactamente lo que necesitamos como **primer Story Package real** — pero su forma actual (constantes JS dispersas y duplicadas) es lo que hay que eliminar.
- **A decidir, no a resolver ahora:** la convivencia de dos apps (`index.html` raíz vs. `app/src`). La arquitectura que sigue asume que **`app/src` (Vite) es la base que evoluciona**; el `index.html` legacy queda fuera de esta arquitectura y se retira en el plan de migración, no se le agrega funcionalidad nueva.

---

## 1. Arquitectura objetivo

Aurora se organiza en **capas por responsabilidad técnica** (Presentation → Application → Domain → Infrastructure), y dentro de eso, en **dos contextos temporales separados** que no deben mezclarse:

- **Runtime (vivir una historia):** todo lo que el viajero experimenta día a día — Story Engine, Story Progress, Memory Engine, Album Engine, Notification Engine, Location Awareness, Synchronization, Settings. **Esto es lo que se construye ahora.**
- **Authoring (crear una historia):** Story Profiling, Story Mood (catálogo), Story Authoring/Curador. **Hoy no necesita ser software.** Para v1, "curar una historia" es literalmente Camilo escribiendo un archivo de contenido a mano. Construir una herramienta de autoría ahora sería resolver un problema que todavía no existe — se deja diseñado, no implementado.

Esta separación es la decisión arquitectónica más importante del documento: evita el error común de construir infraestructura de autoría (paneles, formularios, IA) antes de tener el motor de runtime probado con una sola historia real.

```
                     ┌─────────────────────────┐
                     │   AUTHORING (futuro)     │   ← no se construye en v1
                     │  Profiling · Mood ·      │
                     │  Curator / Aurora Studio │
                     └────────────┬─────────────┘
                                  │ produce
                                  ▼
                     ┌─────────────────────────┐
                     │      STORY PACKAGE       │   ← contrato central (v1: 1 instancia)
                     └────────────┬─────────────┘
                                  │ consumido por
                                  ▼
   ┌───────────────────────── RUNTIME (v1) ─────────────────────────┐
   │  Presentation → Application (Story Engine) → Domain → Infra    │
   └──────────────────────────────────────────────────────────────┘
```

---

## 2. Capas del sistema

| Capa | Responsabilidad | Regla de dependencia |
|---|---|---|
| **Presentation** | Renderizar el estado actual y capturar acciones del viajero. No decide nada, no calcula nada. | Depende de Application. No depende de Infrastructure ni de Domain directamente. |
| **Application** | Orquestar: dado el Story Package + el estado actual, decidir qué mostrar y a qué dominio delegar cada acción. Es el hogar del **Story Engine**. | Depende de Domain (a través de sus contratos). No conoce detalles de Infrastructure (no sabe si algo se guarda en Cloudinary o en localStorage). |
| **Domain** | Las reglas de negocio puras de cada dominio de `DOMAIN_MODEL.md`: la máquina de estados de capítulos, las reglas de una Memoria, las reglas de prioridad de notificación, las reglas de sincronización. **Sin fetch, sin DOM, sin SDK de terceros.** | No depende de ninguna otra capa. Las demás capas dependen de ella, nunca al revés. |
| **Infrastructure** | Los adaptadores técnicos reales: Cloudinary, MongoDB, localStorage, Web Push, Geolocation API, el archivo/fuente del Story Package. | Implementa contratos definidos por Domain (inversión de dependencia). Domain nunca importa Infrastructure. |

**Regla dura, heredada del `DEVELOPMENT_GUIDELINES` original y confirmada por el Domain Model:** si un dominio necesita saber si algo se guardó "en Mongo" o "en Cloudinary" para tomar una decisión de negocio, esa lógica está en la capa equivocada.

---

## 3. Módulos principales (mapeo Dominio → Módulo técnico)

### Runtime — Frontend

| Módulo | Dominio(s) que implementa | Evoluciona de |
|---|---|---|
| **Story Package Provider** | Story Package (consumo, no autoría) | Reemplaza `data.js` y los arrays inline de `index.html`. En v1 es un único documento de contenido cargado al iniciar la app; expone el contrato (capítulos, actividades, lugares, photo spots, momentos sugeridos, reglas narrativas, capítulo especial, copy base, mood asignado) sin que nadie más necesite saber cómo se obtuvo. |
| **Story Engine** | Story Engine | Nuevo. Reemplaza la lógica que hoy vive mezclada en `main.js` (decidir qué sección mostrar). Combina Story Package + Story Progress + Story Mood y responde "esto es lo que corresponde ver ahora". |
| **Story Progress Module** | Story Progress (+ máquina de estados) | Nuevo — hoy no existe ninguna versión de esto en el código. Es la pieza más crítica y con menos reutilización posible del estado actual. |
| **Memory Module** | Memory Engine | Evoluciona de la lógica de fotos/videos hoy separada en `main.js` + el modelo `Memory` que **ya existe parcialmente** en `storage.js`. Se unifica de verdad (foto+video+nota+ubicación+favorito en una sola entidad) y se le agregan las reglas de negocio que hoy no tiene. |
| **Album Module** | Album Engine | Nuevo como módulo independiente; hoy la idea de "álbum" está mezclada dentro del render general de `main.js`. |
| **Notification Client** | Notification Engine (mitad cliente) | Nuevo. No existe ningún sistema de notificaciones hoy. |
| **Location Client** | Location Awareness | Nuevo. No existe detección de proximidad hoy. |
| **Sync Client** | Synchronization | Evoluciona directamente de `app/src/storage.js` (la lógica de `checkBackend` + fallback a localStorage ya es, conceptualmente, esto). Se le quita la responsabilidad de "saber qué es una foto o un checklist" — debe tratar todo como datos opacos a sincronizar. |
| **Media Client** | Media Storage (mitad cliente) | Evoluciona de `app/src/image.js` (compresión) + la porción de subida de `storage.js`. |
| **Settings Module** | Settings | Nuevo, pequeño. |
| **Presentation (UI)** | — (no es un dominio) | Evoluciona de `app/src/main.js`, pero deja de decidir lógica de negocio: pasa a solo pedirle al Story Engine "qué toca mostrar" y renderizarlo. |

### Runtime — Backend (funciones serverless, mismo patrón de Vercel ya usado)

| Módulo | Dominio(s) que implementa | Evoluciona de |
|---|---|---|
| **Sync Endpoint** | Synchronization (mitad servidor) | Evoluciona de `app/api/memories.js` y `app/api/memories/[id].js`, ya reales y funcionando. Se ajusta al modelo `Memory` unificado. |
| **Media Endpoint** | Media Storage (mitad servidor) | Evoluciona de `app/api/upload.js`, ya real. Sin cambios de fondo, solo se aísla de cualquier lógica que no sea "custodiar un archivo". |
| **Story Access Endpoint** | Story Access | Nuevo, pero simple en v1: valida que quien entra tiene el permiso correcto (hoy existe una versión primitiva de esto como contraseña compartida en `auth.js` — se mantiene ese mecanismo en v1, se lo empieza a tratar como una implementación concreta del dominio Story Access, no como autenticación genérica). |

### Authoring — diseñado, no construido en v1

| Módulo | Dominio(s) que implementa | Estado en v1 |
|---|---|---|
| Story Profiling Service | Story Profiling | No existe. En v1 el "perfil" de Buenos Aires 2026 es una decisión manual de Camilo, no un servicio. |
| Story Mood Catalog | Story Mood | En v1 es un único valor fijo (`romantic`) dentro del Story Package — no hace falta un catálogo dinámico todavía, pero el contrato del Story Package ya reserva el campo para no romper nada cuando exista. |
| Story Authoring Tool / Aurora Studio | Story Authoring | No existe. Publicar un Story Package en v1 es un acto manual (editar el documento de contenido y desplegarlo). |
| Traveler Identity Service | Traveler Identity | No existe. En v1 hay un solo viajero implícito por historia — no hace falta identidad real todavía. |

---

## 4. Dependencias permitidas y prohibidas

**Permitidas:**
- Presentation → Application.
- Application → Domain (a través de contratos/interfaces, no de implementaciones concretas).
- Infrastructure → Domain (implementa sus contratos; es la única capa que puede "apuntar hacia adentro" para cumplir un contrato).
- Cualquier módulo de Domain puede depender del **contrato** del Story Package (su forma, no su origen).

**Prohibidas (mapeadas 1 a 1 desde las reglas de aislamiento del Domain Model):**
- Domain → Infrastructure. Ninguna regla de negocio puede importar Cloudinary, Mongo, localStorage, ni el SDK de geolocalización directamente.
- Domain → Presentation. Ninguna regla de negocio sabe cómo se ve nada.
- Story Progress / Memory Engine / Story Mood → entre sí de forma directa. Se comunican solo a través de eventos de dominio que Application escucha y redistribuye — nunca llamándose unos a otros directamente.
- Synchronization / Media Storage → cualquier dominio de negocio (Story, Memory, Chapter). Deben poder compilarse y entenderse sin saber que existen.
- Notification Engine → Media Storage, Album Engine, Story Authoring (heredado directo del Domain Model).
- **Cualquier módulo → contenido hardcodeado de Buenos Aires.** Esta es la prohibición más importante de todo el documento: ni Story Engine, ni Story Progress, ni Presentation pueden contener un solo `if` que mencione una fecha de julio o un nombre propio. Si aparece, es una señal de que ese dato debería estar en el Story Package y no lo está.

---

## 5. Qué vive en el frontend

Todo el **Runtime** que debe funcionar offline vive en el cliente, porque esa es una restricción de producto no negociable ("nunca perder un recuerdo", "nunca bloquear al viajero por falta de conexión"):

- Presentation, Story Engine, Story Progress, Memory Engine (reglas), Album Engine, Settings, Sync Client, Media Client (compresión + cola de subida), Location Client.
- El **Story Package** también vive completo en el cliente en v1 (se descarga una vez y queda disponible offline) — no hace falta pedirlo al servidor en cada interacción.

## 6. Qué vive en el backend

Solo lo que **requiere autoridad centralizada o custodia** que el cliente no puede garantizar por sí solo:

- Custodia real de archivos pesados (Media Endpoint → Cloudinary).
- Persistencia de respaldo de Memorias más allá del dispositivo (Sync Endpoint → MongoDB).
- Validación de acceso a la historia (Story Access Endpoint).
- A futuro: todo lo de Authoring (Profiling, generación de Story Package, panel del Curador) y el disparo real de notificaciones push (que técnicamente requiere un servidor programado, no puede vivir solo en el cliente).

## 7. Qué queda como futuro (diseñado, no construido)

- **Notification Engine completo** (hoy no hay ningún sistema de notificaciones; se diseña el dominio, se implementa cuando haya más de un capítulo remoto que valga la pena notificar).
- **Story Authoring / Aurora Studio** y **Story Profiling** como servicios reales.
- **Traveler Identity** como concepto multi-historia ("biblioteca de una vida").
- **Story Package Provider dinámico** (hoy: un solo documento embebido; futuro: un endpoint que sirve el Story Package correspondiente según qué historia y qué viajero).
- **Location Awareness** más allá de una versión mínima (v1 puede no incluirlo en absoluto sin romper nada, ya que es un dominio aislado).

---

## 8. Plan de migración desde el estado actual

No se ejecuta todavía — es la secuencia recomendada cuando se apruebe pasar a implementación, pensada para no romper lo que ya funciona (el backend de Mongo/Cloudinary es real y no se debe re-hacer).

1. **Congelar el `index.html` legacy.** No recibe features nuevas. Se retira formalmente una vez que `app/src` alcance paridad de contenido.
2. **Extraer el Story Package.** Sacar todo el contenido de `data.js` y del `index.html` legacy a un único documento de contenido con la forma del contrato definido en la sección 3. Es un movimiento de datos, no de lógica — bajo riesgo.
3. **Construir Story Progress.** Es la pieza que hoy no existe en absoluto. Se construye contra el Story Package ya extraído, no contra fechas sueltas.
4. **Introducir el Story Engine** como capa delgada entre Presentation y el resto — reemplaza las decisiones hoy tomadas directamente en `main.js`.
5. **Unificar Memory.** Fusionar de verdad foto/video/nota en una sola entidad, tanto en el cliente como en `app/api/memories.js`.
6. **Separar Synchronization de Media Storage dentro de `storage.js`**, que hoy mezcla ambas responsabilidades en un solo archivo.
7. **Eliminar el sistema de calificaciones** (`.rating` y los puntajes hardcodeados) — no requiere reemplazo, solo remoción.
8. **Alinear la navegación** al esquema de 4 ítems de `12_Experience_Blueprint.md`, retirando el esquema de 11 capítulos del legacy.
9. **Retirar el `index.html` legacy** una vez confirmada la paridad.
10. **(Futuro, fuera de v1)** Construir Authoring: Story Profiling, catálogo dinámico de Story Mood, herramienta de curación, Traveler Identity multi-historia.

---

*Sin código, sin cambios al repositorio. A la espera de aprobación para definir el detalle de implementación del primer paso del plan de migración.*
