import { describe, expect, it } from "vitest";
import { fnv1aUtf8, selectEditorialVariantIndex } from "./hash";

describe("Editorial Voice stable hashing", () => {
  it("implements unsigned FNV-1a over UTF-8 bytes", () => {
    expect(fnv1aUtf8("")).toBe(2166136261);
    expect(fnv1aUtf8("hello")).toBe(1335831723);
    expect(fnv1aUtf8("Mañana")).toBe(677083027);
  });

  it("uses catalog version and stable action identity as the complete seed", () => {
    expect(selectEditorialVariantIndex("editorial-v1", "action-a", 2)).toBe(1);
    expect(selectEditorialVariantIndex("editorial-v1", "action-b", 2)).toBe(0);
    expect(selectEditorialVariantIndex("editorial-v2", "action-a", 2)).toBe(0);
  });
});
