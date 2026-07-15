import { describe, expect, it } from "vitest";
import { EDITORIAL_V1_CATALOG } from "./catalog";
import type { EditorialCatalog } from "./contracts";
import { validateEditorialCatalog, validateEditorialText } from "./validation";

function expectCode(run: () => unknown, code: string): void {
  expect(run).toThrowError(expect.objectContaining({ name: "EditorialContractError", code }));
}

function catalog(overrides: Record<string, unknown> = {}): EditorialCatalog {
  return {
    version: "editorial-v1",
    locale: "es-CL",
    entries: EDITORIAL_V1_CATALOG.entries,
    ...overrides,
  } as EditorialCatalog;
}

describe("validateEditorialText", () => {
  it("accepts normalized one-line text at the inclusive 160-code-point boundary", () => {
    const text = "á".repeat(160);
    expect(Array.from(text)).toHaveLength(160);
    expect(validateEditorialText(text)).toBe(text);
  });

  it("rejects 161 Unicode code points with TEXT_TOO_LONG", () => {
    expectCode(() => validateEditorialText("á".repeat(161)), "TEXT_TOO_LONG");
  });

  it.each(["", "   ", " texto", "texto ", "dos  espacios", "una\nlínea", "e\u0301"]) (
    "rejects malformed, non-trimmed, or non-NFC text %#",
    (text) => expectCode(() => validateEditorialText(text), "INVALID_TEXT"),
  );

  it.each(["DEBES salir", "No Olvídes esto", "TIENES QUE ir", "¡Urgentemente!", "IMPORTANTÍSIMO", "Alertas", "Vos podés", "Mirá el cielo", "ENVÍA AHORA", "Mensaje enviado", "Abre la app", "Sistema activado", "Hola!", "**texto**", "_texto_", "# título", "HOLA MUNDO", "¿¿Ahora??", "Buen viaje 😊"]) (
    "rejects normalized forbidden tone %#",
    (text) => expectCode(() => validateEditorialText(text), "FORBIDDEN_TEXT"),
  );

  it.each(["Hola {name}", "Hola {{name}}", "Hola \\{name\\}", "Hola {name", "Hola name}", "Hola }name{"]) (
    "rejects placeholders, escaped tokens, and malformed braces %#",
    (text) => expectCode(() => validateEditorialText(text), "PLACEHOLDER_NOT_ALLOWED"),
  );
});

describe("validateEditorialCatalog", () => {
  it.each([
    [null, "INVALID_CATALOG"],
    [{}, "INVALID_CATALOG"],
    [catalog({ version: "editorial-v2" }), "INVALID_CATALOG"],
    [catalog({ locale: "es-AR" }), "INVALID_LOCALE"],
  ])("rejects catalog contract violations %#", (value, code) => {
    expectCode(() => validateEditorialCatalog(value), code);
  });

  it("rejects a missing kind without borrowing variants from another kind", () => {
    const { trip_last_day: _missing, ...entries } = EDITORIAL_V1_CATALOG.entries;
    expectCode(() => validateEditorialCatalog(catalog({ entries })), "MISSING_KIND");
  });

  it("rejects duplicate variant IDs across kinds", () => {
    const entries = {
      ...EDITORIAL_V1_CATALOG.entries,
      trip_start_today: [
        { id: "tomorrow-01", text: "Hoy comienza una nueva historia." },
        EDITORIAL_V1_CATALOG.entries.trip_start_today[1],
      ],
    };
    expectCode(() => validateEditorialCatalog(catalog({ entries })), "DUPLICATE_VARIANT_ID");
  });

  it.each([
    ["", "INVALID_TEXT"],
    ["a".repeat(161), "TEXT_TOO_LONG"],
    ["Debes continuar", "FORBIDDEN_TEXT"],
    ["Hola {id}", "PLACEHOLDER_NOT_ALLOWED"],
  ])("propagates the precise entry validation code %#", (text, code) => {
    const entries = {
      ...EDITORIAL_V1_CATALOG.entries,
      trip_start_today: [{ id: "today-01", text }, EDITORIAL_V1_CATALOG.entries.trip_start_today[1]],
    };
    expectCode(() => validateEditorialCatalog(catalog({ entries })), code);
  });
});
