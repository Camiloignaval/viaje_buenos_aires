import { describe, expect, it } from "vitest";
import { TRIP_CREATION_SIGNATURE_VARIANT, shouldPlayTripCreationSignature } from "./creationSignature";

describe("creationSignature", () => {
  it("deja preparado variant=\"micro\" sin reproducir assets inexistentes todavía", () => {
    expect(TRIP_CREATION_SIGNATURE_VARIANT).toBe("micro");
    expect(shouldPlayTripCreationSignature()).toBe(false);
  });
});
