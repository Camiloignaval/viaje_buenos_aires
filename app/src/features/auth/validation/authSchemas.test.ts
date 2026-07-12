import { describe, it, expect } from "vitest";
import {
  emailSchema,
  codeSchema,
  normalizeCodeInput,
} from "./authSchemas";

describe("emailSchema", () => {
  it("exige el correo con el mensaje original", () => {
    const result = emailSchema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Ingresa tu correo.");
    }
  });

  it("rechaza formato inválido con el mensaje original", () => {
    const result = emailSchema.safeParse("no-es-un-mail");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Ingresa un correo válido.");
    }
  });

  it("normaliza (trim) un correo válido", () => {
    const result = emailSchema.safeParse("  kari@example.com  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("kari@example.com");
    }
  });
});

describe("codeSchema", () => {
  it("acepta un código con espacios/guiones y lo normaliza a 6 dígitos", () => {
    const result = codeSchema.safeParse("123 456");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("123456");
    }
  });

  it("rechaza menos de 6 dígitos con el mensaje original", () => {
    const result = codeSchema.safeParse("123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Ingresa los 6 dígitos que te enviamos.",
      );
    }
  });
});

describe("normalizeCodeInput", () => {
  it("descarta no-dígitos y recorta a 6", () => {
    expect(normalizeCodeInput("ab12cd34ef56gh78")).toBe("123456");
  });
});
