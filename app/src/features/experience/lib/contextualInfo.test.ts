import { describe, it, expect } from "vitest";
import { resolveContextualLines } from "./contextualInfo";

describe("resolveContextualLines", () => {
  it("sin metadata no produce líneas (no inventa)", () => {
    expect(resolveContextualLines(undefined, null)).toEqual([]);
    expect(resolveContextualLines({})).toEqual([]);
  });

  it("deriva líneas de los campos presentes", () => {
    const lines = resolveContextualLines({ reservationRecommended: true, bestMoment: "atardecer" });
    const ids = lines.map((l) => l.id);
    expect(ids).toContain("reservation");
    expect(ids).toContain("best-moment");
    expect(lines.find((l) => l.id === "best-moment")?.text).toContain("atardecer");
  });

  it("omite los campos negativos o ausentes", () => {
    const lines = resolveContextualLines({ reservationRecommended: false, rainFriendly: false });
    expect(lines).toEqual([]);
  });

  it("combina actividad y lugar sin duplicar por tipo", () => {
    const lines = resolveContextualLines(
      { reservationRecommended: true },
      { reservationRecommended: true, cashPreferred: true },
    );
    const ids = lines.map((l) => l.id);
    expect(ids.filter((id) => id === "reservation")).toHaveLength(1);
    expect(ids).toContain("cash");
  });
});
