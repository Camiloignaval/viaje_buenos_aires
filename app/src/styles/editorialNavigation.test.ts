import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readCss = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function rule(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`));
  expect(match, `No se encontró la regla ${selector}`).not.toBeNull();
  return match?.[1] ?? "";
}

function expectEditorialBack(css: string, selector: string) {
  const declarations = rule(css, selector);
  expect(declarations).toMatch(/border:\s*(?:0|none);/);
  expect(declarations).toMatch(/background:\s*(?:transparent|none);/);
  expect(declarations).not.toContain("999px");
}

describe("navegación editorial de regreso", () => {
  it("mantiene los regresos de Experience sin fondo, borde ni pill", () => {
    const css = readCss("src/features/experience/experience.css");

    expectEditorialBack(css, ".experience-trips-nav");
    expectEditorialBack(css, ".book-back-link");
  });

  it("mantiene el regreso del diálogo de invitación como acción secundaria", () => {
    const css = readCss("src/features/sharing/sharing.css");

    expectEditorialBack(css, ".invite-dialog-back");
  });

  it("mantiene los regresos del shell sin estilo de CTA", () => {
    const css = readCss("src/styles/shell.css");

    expectEditorialBack(css, ".alaia-entrance-secondary");
    expectEditorialBack(css, ".trips-secondary-nav");
    expectEditorialBack(css, ".trip-form-cancel");
  });
});

describe("aislamiento visual de Experience", () => {
  it("no deja su padding de body activo al volver al shell", () => {
    const css = readCss("src/features/experience/experience.css");
    const declarations = rule(css, "body:has(.alaia-experience)");

    expect(declarations).toMatch(/padding:\s*2rem 1\.25rem;/);
    expect(css).not.toMatch(/(?:^|\n)body \{[^}]*padding:/);
  });
});
