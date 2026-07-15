import { describe, expect, it } from "vitest";
import { EditorialContractError } from "./contracts";

describe("Editorial contracts", () => {
  it("exposes a typed closed error with the exact code", () => {
    const error = new EditorialContractError("INVALID_TEXT");

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: "EditorialContractError", message: "INVALID_TEXT", code: "INVALID_TEXT" });
  });

  it("keeps different validation failures distinguishable", () => {
    expect(new EditorialContractError("FORBIDDEN_TEXT").code).toBe("FORBIDDEN_TEXT");
    expect(new EditorialContractError("PLACEHOLDER_NOT_ALLOWED").code).toBe("PLACEHOLDER_NOT_ALLOWED");
  });
});
