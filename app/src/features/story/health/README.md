# story/health

**Responsabilidad:** inspeccionar la calidad técnica de un Story Package y
producir un `HealthReport` estructurado (críticos, advertencias, sugerencias) y
un `QualityScore` interno. Herramienta de calidad, no de runtime.

**Qué NO hace:**
- No modifica contenido, no corrige, no inventa datos, no oculta errores.
- No depende de React, red ni almacenamiento.
- No conoce ninguna historia concreta: valida la _forma_ y la _coherencia_ de cualquier paquete.

**Cómo se usa:**

```ts
import { runHealthCheck } from "@/features/story/health/healthCheck";

const report = runHealthCheck(storyPackage, {
  // opcional: resolver de media inyectado (Node/CI). Sin él, la media no se
  // marca como faltante, solo como "no verificada".
  assetExists: (ref) => existsSync(join(publicDir, ref)),
});
// report.status === "ok" | "issues"  (issues sólo ante hallazgos críticos)
```

**Categorías:** metadata, structure, timeline, destination, media, monetary,
experience, references, accessibility, context.

**Severidad:** `critical` (puede bloquear publicación) · `warning` · `info`.

**Extensible:** `runHealthCheck(raw, ctx, extraCheckers)` acepta checkers
adicionales. Futuras validaciones (metadata IA incompleta, emociones faltantes)
se suman como checkers sin tocar el núcleo.

**Aislamiento:** corre en tests, scripts y CI. El test
`healthCheck.test.ts` incluye un gate que ejecuta el motor contra el Story
Package real con un resolver de assets basado en `fs`.
