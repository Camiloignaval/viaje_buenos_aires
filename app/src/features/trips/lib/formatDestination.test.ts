import { describe, it, expect } from "vitest";
import { formatDestination } from "./formatDestination";

describe("formatDestination", () => {
  it("devuelve el string tal cual para viajes legacy", () => {
    expect(formatDestination("Buenos Aires")).toBe("Buenos Aires");
  });

  it("usa cityName + adminName cuando hay provincia/estado", () => {
    expect(
      formatDestination({
        countryCode: "AR",
        countryName: "Argentina",
        cityId: "1",
        cityName: "Buenos Aires",
        adminName: "CABA",
        latitude: -34.6,
        longitude: -58.4,
        timezone: "America/Argentina/Buenos_Aires",
      }),
    ).toBe("Buenos Aires, CABA");
  });

  it("usa cityName + countryName cuando no hay adminName", () => {
    expect(
      formatDestination({
        countryCode: "FR",
        countryName: "Francia",
        cityId: "2",
        cityName: "París",
        latitude: 48.85,
        longitude: 2.35,
        timezone: "Europe/Paris",
      }),
    ).toBe("París, Francia");
  });
});
