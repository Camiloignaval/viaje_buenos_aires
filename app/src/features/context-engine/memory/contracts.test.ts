import { describe, expect, it } from "vitest";
import {
  MEMORY_IDENTITY_VERSION,
  MEMORY_RECORD_KIND,
  MemoryEngineError,
  createMemoryDiscard,
} from "./contracts";

describe("Memory contracts", () => {
  it("exposes closed discard reasons without retaining input data", () => {
    const discard = createMemoryDiscard("invalid_input");

    expect(Object.keys(discard)).toEqual(["outcome", "reason", "type"]);
    expect(discard).toEqual({ outcome: "discard", reason: "invalid_input", type: null });
  });

  it.each(["OWNERSHIP_DENIED", "SCHEMA_REJECTED", "REPOSITORY_FAILURE", "INVALID_LIFECYCLE_TRANSITION"] as const)(
    "exposes only the typed %s contract error without raw data",
    (code) => {
      expect(new MemoryEngineError(code)).toMatchObject({ name: "MemoryEngineError", code, message: code });
      expect(Object.keys(new MemoryEngineError(code)).sort()).toEqual(["code", "name"]);
    },
  );

  it("versions records and identities through closed public constants", () => {
    expect({ recordKind: MEMORY_RECORD_KIND, identityVersion: MEMORY_IDENTITY_VERSION }).toEqual({
      recordKind: "alaia_memory_record_v1",
      identityVersion: "memory-key-v1",
    });
  });
});
