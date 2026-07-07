# CURRENT_PROJECT_ANALYSIS.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Estado real del código en `c:\Users\c.valenzuela\guia-buenos-aires-kari` a la fecha, contrastado contra las 5 decisiones de producto confirmadas.
**Estado:** Solo análisis — no se modificó ni escribió código.

---

## 1. Madurez del proyecto

- **2 commits** en total (`bc81bb3` inicial, `dd49b91` "proyecto finalizado") + cambios sin commitear en `main.js`, `storage.js`, `data.js`, `style.css`, `index.html`.
- **Sin tests, sin lint, sin CI.** Es código de prototipo funcional para un viaje real, no una base de producto madura.
- Coexisten **dos aplicaciones separadas y no sincronizadas**:
  - `index.html` (raíz, 3226 líneas): guía estática "Buenos Aires 2026", con su propia copia de la lógica de datos y persistencia inline.
  - `app/src/*` (mini-app Vite): reescritura más moderna con `main.js`, `data.js`, `storage.js`, `auth.js`, `image.js`.
- Esto ya es un hallazgo en sí mismo: **hay dos fuentes de verdad del mismo producto**, mantenidas a mano en paralelo.

## 2. Qué hace el código hoy (resumen por módulo)

| Módulo | Responsabilidad real |
|---|---|
| `index.html` (raíz) | Guía estática completa de Buenos Aires 2026: hero, checklist, álbum, videos, mapa, presupuesto, souvenirs, carta final. Todo el contenido y la persistencia están inline en `<script>`. |
| `app/src/data.js` | Constantes literales: checklist, fotos, videos — 100% contenido de Buenos Aires 2026 hardcodeado. |
| `app/src/main.js` | Renderiza todo el DOM vía `innerHTML` en cada `refresh()`. Sin router, sin componentes, sin navegación. |
| `app/src/storage.js` | Persistencia real (no mock): localStorage + fetch a `app/api/*` (Mongo + Cloudinary), con fallback automático si el backend no responde. |
| `app/src/auth.js` | Modal de contraseña compartida para habilitar subida de fotos/video. |
| `app/src/image.js` | Compresión client-side de imágenes antes de subir. |

**Backend real, no solo documentado:** `app/api/memories.js`, `app/api/upload.js` y `app/lib/mongodb.js` implementan CRUD contra MongoDB Atlas y subida a Cloudinary de verdad. El estado de despliegue (Vercel) no puede verificarse leyendo código.

## 3. Gap Analysis — decisiones de producto vs. código actual

| # | Decisión confirmada | Veredicto | Evidencia |
|---|---|---|---|
| 1 | El motor depende de un **Story Package**; 07/08 son solo la instancia BA2026 | **VIOLA** | No existe ningún objeto/esquema "Story Package". El contenido está hardcodeado como `export const` en `data.js` y como arrays inline en `index.html`. Motor y contenido son el mismo archivo. |
| 2 | Navegación oficial = **Experience Blueprint** (modo memoria: Historia, Álbum, Mapa, Nosotros) | **VIOLA** | La mini-app Vite no tiene navegación (0 ítems). La guía estática tiene un esquema propio de 11 secciones (`CHAPTERS`), distinto a cualquiera de los definidos en los documentos. |
| 3 | **Ratings/estrellas eliminados** del producto | **VIOLA** | Sistema de calificación activo y renderizado con puntajes reales de restaurantes (ej. La Cabrera 4.6, Florería Atlántico 4.7) en `index.html`. |
| 4 | Foto + Video + Nota = un solo concepto **Memory** | **PARCIAL** | `storage.js` ya define un modelo `Memory` compartido a nivel de persistencia. Pero en la UI (`main.js`), foto y video siguen siendo catálogos y componentes separados, sin campo de ubicación ni de favorito, y sin soporte para que una Memory agrupe varios medios a la vez. |
| 5 | v1 con un solo Story Package, pero **arquitectura lista para multi-historia** sin reescribir código | **PARCIAL** | El hardcode de v1 está cumplido al 100%. Pero no hay ninguna capa de indirección: `data.js` se importa directamente sin interfaz, y la duplicación con `index.html` implica que agregar una segunda historia hoy requeriría reescribir código en **dos lugares**, no en uno. |

## 4. Lectura arquitectónica

- **No hay separación en capas** (Presentation/Application/Domain/Infrastructure). Es una arquitectura plana por convención de archivo, no por contrato.
- **No hay máquina de estados de capítulo.** No existe lógica que compare fecha actual vs. fecha del viaje para bloquear/desbloquear días — todos los días son siempre visibles. Lo único parecido a "bloqueo" es el gating de contraseña para subir contenido, que es un concepto distinto (autenticación, no progresión narrativa).
- **Vocabulario de marca no está adoptado en el código.** La mini-app usa términos técnicos genéricos (`Memory`, `checklist`, `upsertMemory`); la guía estática usa "Capítulo" de forma suelta, sin que sea una entidad de dominio formal.
- **CSS duplicado:** dos sistemas de diseño sin tokens compartidos (`app/src/style.css` vs. el `<style>` embebido en `index.html`).

## 5. Conclusión ejecutiva

El código actual es, técnicamente, el **prototipo original del regalo a Kari**, al que se le sumó persistencia real (Mongo/Cloudinary) encima — pero **no se dio ningún paso hacia la arquitectura Aurora** descrita en la documentación. De las 5 decisiones de producto confirmadas, **3 se violan directamente** (Story Package, navegación, ratings) y **2 se cumplen solo a medias** (Memory unificado, extensibilidad multi-historia).

Esto no es un diagnóstico negativo del trabajo hecho — el backend de persistencia es sólido y reutilizable — sino la constatación de que **hoy no existe ninguna base de motor genérico**: todo lo que se construyó fue para un único viaje, sin abstracción de por medio. Cualquier plan de arquitectura debe partir de esta realidad, no de la documentación de visión.

---

*Solo análisis. No se propuso arquitectura ni se escribió código. A la espera de indicación para el siguiente paso.*
