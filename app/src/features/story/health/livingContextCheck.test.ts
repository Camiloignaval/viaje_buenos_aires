import { describe, expect, it } from "vitest";
import type { StoryPackage } from "@/features/story/engine/types";
import { runHealthCheck } from "./healthCheck";
import { checkLivingContext } from "./livingContextCheck";

function pkg(): StoryPackage {
  return {
    storyId: "story-ba-2026", schemaVersion: "1.4",
    metadata: { destination: "Buenos Aires, Argentina", destinationCountryCode: "AR", title: "Story", travelDates: { start: "2026-07-10", end: "2026-07-12" }, language: "es" },
    storyMood: { primary: "warm" }, unlockRulesDefault: {},
    chapters: [{ id: "c1", order: 1, title: "Día", copy: { open: "Abrir" } }],
    budget: { currency: "ARS" },
    baseCopy: { welcomeMessage: "Hola", dailyOpenTemplate: "Abrir", dailyCloseTemplate: "Cerrar" },
  };
}

describe("checkLivingContext", () => {
  it("una Story legacy sin metadata nueva sigue válida y sin críticos", () => {
    const report = runHealthCheck(pkg());
    expect(report.status).toBe("ok");
    expect(report.counts.critical).toBe(0);
    expect(report.findings.filter((item) => item.code.startsWith("living-context."))).toEqual([]);
  });

  it("metadata declarada pero parcial produce warnings con códigos y paths estables", () => {
    const story = pkg();
    story.metadata.livingContext = { countryCode: "AR", locale: "" };
    const original = structuredClone(story);
    const findings = checkLivingContext(story, {});
    expect(findings.map(({ code, path, severity }) => ({ code, path, severity }))).toEqual([
      { code: "living-context.missing-locale", path: "metadata.livingContext.locale", severity: "warning" },
      { code: "living-context.missing-timezone", path: "metadata.livingContext.timezone", severity: "warning" },
      { code: "living-context.missing-currency", path: "metadata.livingContext.currency", severity: "warning" },
    ]);
    expect(story).toEqual(original);
  });

  it("detecta el baseStoryId cargado para otra identidad sin comparar con storyId", () => {
    const findings = checkLivingContext(pkg(), { livingContext: { baseStoryId: "ba-2026", loadedStoryBaseStoryId: "rio-2027" } });
    expect(findings.map((item) => item.path)).toEqual(["$context.baseStoryId", "$context.loadedStoryBaseStoryId"]);
    expect(findings.every((item) => item.code === "living-context.story-identity-mismatch")).toBe(true);
  });

  it("advierte incoherencia destination/timezone local y omite valores sensibles", () => {
    const story = pkg();
    story.metadata.livingContext = { countryCode: "AR", locale: "es-AR", timezone: "America/Argentina/Buenos_Aires", currency: "ARS" };
    const findings = checkLivingContext(story, { livingContext: {
      destination: { countryCode: "CL", timezone: "America/Santiago", diagnosticValue: "kari@example.com -34.6037,-58.3816" },
    } });
    expect(findings.map((item) => item.code)).toEqual([
      "living-context.destination-mismatch",
      "living-context.timezone-mismatch",
    ]);
    expect(JSON.stringify(findings)).not.toMatch(/kari|34\.6037|58\.3816|America\/Santiago/);
  });

  it("metadata completa no exige clima, eventos, transporte ni alertas", () => {
    const story = pkg();
    story.metadata.livingContext = { countryCode: "AR", locale: "es-AR", timezone: "America/Argentina/Buenos_Aires", currency: "ARS" };
    expect(checkLivingContext(story, {})).toEqual([]);
  });

  it("advierte country, locale, timezone y currency no resolubles sin repetir valores", () => {
    const story = pkg();
    story.metadata.livingContext = { countryCode: "ZZ", locale: "not_a_locale", timezone: "Mars/Olympus", currency: "ZZZ" };
    const findings = checkLivingContext(story, {});
    expect(findings.map((item) => item.code)).toEqual([
      "living-context.invalid-country-code",
      "living-context.invalid-locale",
      "living-context.invalid-timezone",
      "living-context.invalid-currency",
    ]);
    expect(JSON.stringify(findings)).not.toMatch(/not_a_locale|Mars\/Olympus|ZZZ/);
  });

  it("advierte locale incoherente con el destino efectivo", () => {
    const story = pkg();
    story.metadata.livingContext = { countryCode: "AR", locale: "es-CL", timezone: "America/Argentina/Buenos_Aires", currency: "ARS" };
    const findings = checkLivingContext(story, { livingContext: {
      destination: { countryCode: "AR", timezone: "America/Argentina/Buenos_Aires", locale: "es-AR" },
    } });
    expect(findings.map((item) => item.code)).toEqual(["living-context.locale-mismatch"]);
    expect(findings[0].path).toBe("metadata.livingContext.locale");
  });
});
