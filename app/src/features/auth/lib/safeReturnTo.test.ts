import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./safeReturnTo";

describe("safeReturnTo", () => {
  it("acepta rutas internas de la allowlist (con query)", () => {
    expect(safeReturnTo("/invite/abc123")).toBe("/invite/abc123");
    expect(safeReturnTo("/trips")).toBe("/trips");
    expect(safeReturnTo("/trips/trip-1")).toBe("/trips/trip-1");
    expect(safeReturnTo("/experience?tripId=t1")).toBe("/experience?tripId=t1");
  });

  it("descarta open redirects y esquemas externos", () => {
    expect(safeReturnTo("//evil.com")).toBeNull();
    expect(safeReturnTo("https://evil.com")).toBeNull();
    expect(safeReturnTo("http://evil.com")).toBeNull();
    expect(safeReturnTo("javascript:alert(1)")).toBeNull();
    expect(safeReturnTo("/\\evil.com")).toBeNull();
    expect(safeReturnTo("/path\\with\\backslash")).toBeNull();
  });

  it("descarta rutas internas fuera de la allowlist", () => {
    expect(safeReturnTo("/admin")).toBeNull();
    expect(safeReturnTo("/api/secret")).toBeNull();
    expect(safeReturnTo("relative/path")).toBeNull();
  });

  it("descarta vacíos y no-strings", () => {
    expect(safeReturnTo("")).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
  });
});
