import { describe, it, expect } from "vitest";
import { toRoman } from "./toRoman";

describe("toRoman", () => {
  it("numera capítulos I..X como el original", () => {
    expect(toRoman(1)).toBe("I");
    expect(toRoman(3)).toBe("III");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(5)).toBe("V");
    expect(toRoman(9)).toBe("IX");
    expect(toRoman(10)).toBe("X");
  });
});
