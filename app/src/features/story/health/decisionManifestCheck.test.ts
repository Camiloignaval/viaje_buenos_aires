import { describe, expect, it, vi } from "vitest";
import realStory from "@/content/stories/buenos-aires-2026/story.json";
import { checkDecisionManifest, inspectDecisionManifest } from "./decisionManifestCheck";
import { runHealthCheck } from "./healthCheck";

const FROM = "2026-10-03T14:00:00.000Z";
const UNTIL = "2026-10-03T16:00:00.000Z";

function manifest() {
  return {
    rules: [
      {
        id: "trip-start-today",
        requiredCapabilities: ["temporal"],
        abstainReasons: ["actionable", "trip_not_applicable"],
        window: { validFrom: FROM, validUntil: UNTIL },
        dedupeStrategy: "semantic",
        expiresAt: UNTIL,
        candidateMetadata: [],
      },
      {
        id: "weather-attention-candidate",
        requiredCapabilities: ["weather"],
        abstainReasons: ["actionable", "module_stale", "weak_signal"],
        window: { validFrom: FROM, validUntil: UNTIL },
        dedupeStrategy: "semantic",
        expiresAt: UNTIL,
        candidateMetadata: ["outdoor", "rainFriendly"],
      },
      {
        id: "light-moment-candidate",
        requiredCapabilities: ["weather", "narrative"],
        abstainReasons: ["actionable", "missing_activity_metadata"],
        window: { validFrom: FROM, validUntil: UNTIL },
        dedupeStrategy: "semantic",
        expiresAt: UNTIL,
        candidateMetadata: ["photoMoment"],
      },
    ],
  } as const;
}

describe("inspectDecisionManifest", () => {
  it("identifica ambos paths de ids duplicados sin exponer el id", () => {
    const value = manifest();
    const findings = inspectDecisionManifest({ rules: [...value.rules, { ...value.rules[0] }] });

    expect(findings.filter(({ code }) => code === "decision-manifest.duplicate-rule-id").map(({ path }) => path)).toEqual([
      "$context.decisionManifest.rules[0].id",
      "$context.decisionManifest.rules[3].id",
    ]);
    expect(JSON.stringify(findings)).not.toContain("trip-start-today");
  });

  it("detecta capabilities y reason codes fuera de contratos cerrados", () => {
    const value = manifest();
    const findings = inspectDecisionManifest({ rules: [{
      ...value.rules[0],
      requiredCapabilities: ["coordinates-private"],
      abstainReasons: ["raw-provider-error"],
    }] });

    expect(findings.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "decision-manifest.unknown-capability", path: "$context.decisionManifest.rules[0].requiredCapabilities[0]" },
      { code: "decision-manifest.unknown-reason-code", path: "$context.decisionManifest.rules[0].abstainReasons[0]" },
    ]);
    expect(JSON.stringify(findings)).not.toMatch(/coordinates-private|raw-provider-error/);
  });

  it("detecta ventanas invertidas e invalidas con paths estables", () => {
    const value = manifest();
    const findings = inspectDecisionManifest({ rules: [
      { ...value.rules[0], window: { validFrom: UNTIL, validUntil: FROM } },
      { ...value.rules[1], window: { validFrom: "kari@example.com", validUntil: UNTIL } },
    ] });

    expect(findings.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "decision-manifest.invalid-window", path: "$context.decisionManifest.rules[0].window" },
      { code: "decision-manifest.invalid-window", path: "$context.decisionManifest.rules[1].window" },
    ]);
    expect(JSON.stringify(findings)).not.toContain("kari@example.com");
  });

  it("advierte dedupe y expiracion requeridos ausentes", () => {
    const value = manifest();
    const findings = inspectDecisionManifest({ rules: [{
      ...value.rules[0],
      dedupeStrategy: undefined,
      expiresAt: undefined,
    }] });

    expect(findings.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "decision-manifest.missing-dedupe-strategy", path: "$context.decisionManifest.rules[0].dedupeStrategy" },
      { code: "decision-manifest.missing-required-expiry", path: "$context.decisionManifest.rules[0].expiresAt" },
    ]);
  });

  it("detecta metadata estructurada incompatible para Weather y Light", () => {
    const value = manifest();
    const findings = inspectDecisionManifest({ rules: [
      { ...value.rules[1], candidateMetadata: ["bestMomentText"] },
      { ...value.rules[2], candidateMetadata: ["outdoor"] },
    ] });

    expect(findings.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "decision-manifest.incompatible-candidate-metadata", path: "$context.decisionManifest.rules[0].candidateMetadata" },
      { code: "decision-manifest.incompatible-candidate-metadata", path: "$context.decisionManifest.rules[1].candidateMetadata" },
    ]);
    expect(JSON.stringify(findings)).not.toContain("bestMomentText");
  });

  it("acepta un manifiesto contractual completo sin findings", () => {
    expect(inspectDecisionManifest(manifest())).toEqual([]);
  });

  it("es legacy-safe cuando no existe manifiesto", () => {
    expect(inspectDecisionManifest(undefined)).toEqual([]);
    expect(inspectDecisionManifest(null)).toEqual([]);
  });

  it("sanitiza valores sensibles y tipos crudos invalidos", () => {
    const findings = inspectDecisionManifest({ rules: [{
      id: { email: "kari@example.com" },
      requiredCapabilities: ["token=secret"],
      abstainReasons: [{ providerPayload: "private" }],
      window: { validFrom: "-34.6037,-58.3816", validUntil: "raw error" },
      dedupeStrategy: "trip-private:kari@example.com",
      expiresAt: "budget=999999",
      candidateMetadata: ["private-notes"],
    }] });

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every(({ severity }) => severity === "warning")).toBe(true);
    expect(JSON.stringify(findings)).not.toMatch(/kari|secret|private|34\.6037|58\.3816|budget|999999|raw error/);
  });
});

describe("checkDecisionManifest - Health seam", () => {
  it("no ejecuta reglas, providers ni I/O y deja Weather ausente o no configurado no critico", () => {
    const evaluate = vi.fn();
    const fetchProvider = vi.fn();
    const value = { ...manifest(), evaluate, fetchProvider };

    const absent = runHealthCheck(realStory, { decisionManifest: value }, [checkDecisionManifest]);
    const unconfigured = runHealthCheck(realStory, {
      decisionManifest: value,
      livingContext: { weather: { providerStatus: "unconfigured" } },
    }, [checkDecisionManifest]);

    expect(absent.findings.filter(({ code }) => code.startsWith("decision-manifest."))).toEqual([]);
    expect(unconfigured.counts.critical).toBe(0);
    expect(unconfigured.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "living-context.weather-provider-unconfigured", severity: "info" }),
    ]));
    expect(evaluate).not.toHaveBeenCalled();
    expect(fetchProvider).not.toHaveBeenCalled();
  });

  it("no muta Story ni manifiesto durante la inspeccion", () => {
    const value = manifest();
    const frozen = Object.freeze({ rules: Object.freeze(value.rules.map((rule) => Object.freeze({ ...rule }))) });
    const beforeStory = JSON.stringify(realStory);

    const report = runHealthCheck(realStory, { decisionManifest: frozen }, [checkDecisionManifest]);

    expect(report.counts.critical).toBe(0);
    expect(JSON.stringify(realStory)).toBe(beforeStory);
    expect(frozen.rules).toHaveLength(3);
  });
});
