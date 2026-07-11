import { describe, it, expect } from "vitest";
import { onboardingSchema } from "./onboardingSchema";

describe("onboardingSchema", () => {
  it("exige displayName", () => {
    const result = onboardingSchema.safeParse({ displayName: "  ", residenceCountryCode: "CL" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === "displayName")?.message).toBe(
        "Decinos cómo te llamamos.",
      );
    }
  });

  it("exige un país de residencia con formato ISO alpha-2", () => {
    const result = onboardingSchema.safeParse({ displayName: "Kari", residenceCountryCode: "Chile" });
    expect(result.success).toBe(false);
  });

  it("normaliza el código de país a mayúsculas y recorta el nombre", () => {
    const result = onboardingSchema.safeParse({ displayName: "  Kari  ", residenceCountryCode: "cl" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ displayName: "Kari", residenceCountryCode: "CL" });
    }
  });
});
