import { describe, expect, it } from "vitest";
import { maskEmail } from "./maskEmail";

describe("maskEmail", () => {
  it("enmascara el local y conserva el dominio (idéntico al backend)", () => {
    expect(maskEmail("pareja@mail.com")).toBe("p•••••@mail.com");
    expect(maskEmail("a@b.co")).toBe("a•@b.co");
  });

  it("devuelve un placeholder si no hay arroba", () => {
    expect(maskEmail("sinarroba")).toBe("•••");
    expect(maskEmail("")).toBe("•••");
  });
});
