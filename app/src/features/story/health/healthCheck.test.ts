import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runHealthCheck, type StoryHealthChecker } from "./healthCheck";
import realStory from "@/story/data/story-ba2026.json";

// Paquete mínimo válido; cada test lo desvía para provocar un hallazgo puntual.
function validPackage(): Record<string, unknown> {
  return {
    storyId: "story-test",
    schemaVersion: "1.4",
    metadata: {
      destination: "Buenos Aires, Argentina",
      title: "Historia de prueba",
      travelDates: { start: "2026-07-10", end: "2026-07-13" },
      language: "es",
    },
    storyMood: { primary: "warm" },
    unlockRulesDefault: { requiresDateReached: true },
    baseCopy: { welcomeMessage: "Hola", dailyOpenTemplate: "x", dailyCloseTemplate: "y" },
    budget: { currency: "ARS" },
    chapters: [
      { id: "c1", order: 1, title: "Día 1", date: "2026-07-10", copy: { open: "Arranca" } },
      { id: "c2", order: 2, title: "Día 2", date: "2026-07-11", copy: { open: "Sigue" } },
    ],
  };
}

function codes(report: ReturnType<typeof runHealthCheck>): string[] {
  return report.findings.map((f) => f.code);
}

describe("runHealthCheck — paquete válido", () => {
  it("un paquete correcto no tiene hallazgos críticos", () => {
    const report = runHealthCheck(validPackage());
    expect(report.status).toBe("ok");
    expect(report.counts.critical).toBe(0);
    expect(report.score.overall).toBeGreaterThanOrEqual(90);
  });
});

describe("runHealthCheck — validación de forma", () => {
  it("un objeto sin la forma mínima devuelve un crítico, no lanza", () => {
    const report = runHealthCheck({ storyId: "roto" });
    expect(report.status).toBe("issues");
    expect(report.counts.critical).toBeGreaterThanOrEqual(1);
    expect(report.storyId).toBe("roto");
  });
});

describe("runHealthCheck — metadata y timeline", () => {
  it("detecta fechas de viaje inválidas", () => {
    const pkg = validPackage();
    (pkg.metadata as Record<string, unknown>).travelDates = { start: "ayer", end: "hoy" };
    expect(codes(runHealthCheck(pkg))).toContain("metadata.invalid-travel-dates");
  });

  it("detecta fechas de viaje invertidas", () => {
    const pkg = validPackage();
    (pkg.metadata as Record<string, unknown>).travelDates = { start: "2026-07-13", end: "2026-07-10" };
    expect(codes(runHealthCheck(pkg))).toContain("metadata.reversed-travel-dates");
  });

  it("detecta una fecha de capítulo fuera del rango del viaje", () => {
    const pkg = validPackage();
    (pkg.chapters as Array<Record<string, unknown>>)[1].date = "2026-08-01";
    expect(codes(runHealthCheck(pkg))).toContain("timeline.date-outside-travel-range");
  });
});

describe("runHealthCheck — estructura y referencias", () => {
  it("detecta ids de capítulo duplicados", () => {
    const pkg = validPackage();
    (pkg.chapters as Array<Record<string, unknown>>)[1].id = "c1";
    const report = runHealthCheck(pkg);
    expect(codes(report)).toContain("structure.duplicate-chapter-id");
    expect(report.status).toBe("issues");
  });

  it("detecta referencias a capítulos inexistentes", () => {
    const pkg = validPackage();
    pkg.photoSpots = [{ id: "p1", title: "Spot", relatedChapterId: "no-existe" }];
    expect(codes(runHealthCheck(pkg))).toContain("references.dangling-chapter-ref");
  });

  it("detecta un capítulo vacío", () => {
    const pkg = validPackage();
    (pkg.chapters as Array<Record<string, unknown>>)[1] = { id: "c2", order: 2, title: "Vacío" };
    expect(codes(runHealthCheck(pkg))).toContain("experience.empty-chapter");
  });
});

describe("runHealthCheck — media", () => {
  it("sin resolver, marca la media como no verificada (info)", () => {
    const pkg = validPackage();
    (pkg.chapters as Array<Record<string, unknown>>)[0].assets = { heroImage: "x.jpg" };
    const report = runHealthCheck(pkg);
    expect(codes(report)).toContain("media.not-verified");
    expect(report.counts.critical).toBe(0);
  });

  it("con resolver, detecta un asset faltante", () => {
    const pkg = validPackage();
    (pkg.chapters as Array<Record<string, unknown>>)[0].assets = { heroImage: "falta.jpg" };
    const report = runHealthCheck(pkg, { assetExists: (p) => p !== "falta.jpg" });
    expect(codes(report)).toContain("media.missing-asset");
  });
});

describe("runHealthCheck — monetario", () => {
  it("marca una moneda extranjera sin encuadre de referencia", () => {
    const pkg = validPackage();
    pkg.placesCatalog = { restaurants: [{ id: "r1", name: "R", recommendation: "Costó $40.000 CLP." }] };
    expect(codes(runHealthCheck(pkg))).toContain("monetary.unframed-foreign-currency");
  });

  it("acepta una moneda extranjera encuadrada como referencia", () => {
    const pkg = validPackage();
    pkg.placesCatalog = { restaurants: [{ id: "r1", name: "R", recommendation: "Unos $40.000 CLP como referencia al cambio." }] };
    expect(codes(runHealthCheck(pkg))).not.toContain("monetary.unframed-foreign-currency");
  });
});

describe("runHealthCheck — extensibilidad", () => {
  it("acepta checkers adicionales sin tocar el núcleo", () => {
    const extra: StoryHealthChecker = () => [
      { category: "context", severity: "info", code: "custom.check", message: "extra" },
    ];
    expect(codes(runHealthCheck(validPackage(), {}, [extra]))).toContain("custom.check");
  });
});

describe("runHealthCheck — Story Package real (gate de CI)", () => {
  it("story-ba2026 pasa sin críticos y con toda su media resuelta", () => {
    const publicDir = join(process.cwd(), "public");
    const assetExists = (ref: string) => existsSync(join(publicDir, ref));
    const report = runHealthCheck(realStory, { assetExists });

    expect(report.status).toBe("ok");
    expect(report.counts.critical).toBe(0);
    expect(codes(report)).not.toContain("media.missing-asset");
    expect(codes(report)).not.toContain("monetary.unframed-foreign-currency");
    expect(report.score.overall).toBeGreaterThanOrEqual(85);
  });
});
