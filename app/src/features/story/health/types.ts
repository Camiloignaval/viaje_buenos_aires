// Contratos del Story Package Health Check Engine. Un reporte estructurado,
// legible por humanos y por máquinas, sobre la calidad técnica de una historia.
// No depende de React, red ni almacenamiento — corre en tests, scripts y CI.

export type Severity = "critical" | "warning" | "info";

export type HealthCategory =
  | "metadata"
  | "structure"
  | "timeline"
  | "destination"
  | "media"
  | "monetary"
  | "experience"
  | "references"
  | "accessibility"
  | "context"
  | "intelligence";

/** Un hallazgo: qué falló (message), dónde (path), y cómo corregirlo (suggestion). */
export interface HealthFinding {
  category: HealthCategory;
  severity: Severity;
  /** Código estable legible por máquina, ej. "metadata.invalid-travel-dates". */
  code: string;
  message: string;
  /** Ubicación dentro del paquete, ej. "chapters[2].activities[0]". */
  path?: string;
  /** Cómo corregirlo, cuando existe una corrección objetiva. */
  suggestion?: string;
}

/**
 * Puntuación de calidad editorial. Interna: nunca se muestra al usuario ni se
 * usa como métrica comercial. Solo ayuda a detectar historias que requieren
 * curación. 0–100 global y por dimensión.
 */
export interface QualityScore {
  overall: number;
  dimensions: Record<HealthCategory, number>;
}

export interface HealthReport {
  storyId: string | null;
  /** "ok" si no hay hallazgos críticos; "issues" en caso contrario. */
  status: "ok" | "issues";
  findings: HealthFinding[];
  counts: Record<Severity, number>;
  score: QualityScore;
  /** Resumen legible de una línea. */
  summary: string;
}

/**
 * Dependencias inyectadas. `assetExists` permite validar media sin acoplar el
 * motor al sistema de archivos: en Node/CI se inyecta un resolver real; en el
 * browser se omite y la media no se marca como faltante, solo como no verificada.
 */
export interface HealthCheckContext {
  assetExists?: (assetPath: string) => boolean;
  livingContext?: {
    /** Identidad solicitada por Trip y la identidad externa realmente cargada. */
    baseStoryId?: string | null;
    loadedStoryBaseStoryId?: string | null;
    destination?: {
      countryCode?: string | null;
      timezone?: string | null;
      locale?: string | null;
      [key: string]: unknown;
    };
    weather?: {
      providerStatus?: "configured" | "unconfigured";
      snapshotStatus?: "valid" | "invalid";
    };
  };
}
