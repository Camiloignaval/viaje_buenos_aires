import { describe, it, expect } from "vitest";
import { loadStoryPackage } from "@/features/story/engine/storyPackage";
import realStory from "./story.json";

describe("adaptive Story evidence", () => {
  it("curates the six evidence-backed activities with exact structured metadata", () => {
    const pkg = loadStoryPackage(realStory);
    const curated = pkg.chapters.flatMap((chapter) => chapter.activities ?? [])
      .filter((activity) => activity.contextWindow);

    expect(curated.map(({ id }) => id)).toEqual(["act-1-3", "act-1-drone-obelisco", "act-2-2", "act-2-6", "act-2-8", "act-3-5"]);
    expect(curated).toHaveLength(6);
    for (const activity of curated) {
      expect(Object.keys(activity.intelligence ?? {}).sort()).toEqual(["indoor", "outdoor", "photoMoment", "rainFriendly"]);
      expect(Object.keys(activity.contextWindow ?? {}).sort()).toEqual(["timezone", "validFrom", "validUntil"]);
    }
    expect(pkg.chapters.flatMap((chapter) => chapter.activities ?? [])).toHaveLength(36);
  });
});

describe("Buenos Aires Signature Story package", () => {
  it("keeps the destination budget in ARS and declares the traveler conversion separately", () => {
    const pkg = loadStoryPackage(realStory);
    const serialized = JSON.stringify(pkg);

    expect(pkg.budget).toEqual({
      currency: "ARS",
      travelerCurrency: "CLP",
      travelerCount: 2,
      showConvertedEstimate: true,
      conversionLabel: "aprox.",
    });
    expect(serialized).not.toContain("resurfaceOnAnniversary");
  });

  it("aligns curated photo copy with the activity windows", () => {
    const pkg = loadStoryPackage(realStory);
    const activities = new Map(pkg.chapters.flatMap((chapter) => chapter.activities ?? []).map((activity) => [activity.id, activity]));
    const spots = new Map((pkg.photoSpots ?? []).map((spot) => [spot.id, spot]));

    expect(activities.get("act-1-3")).toMatchObject({ timeWindow: "16:45–18:20", contextWindow: { validFrom: "2026-07-18T19:45:00.000Z", validUntil: "2026-07-18T21:30:00.000Z" } });
    expect(activities.get("act-2-6")).toMatchObject({ timeWindow: "15:00–17:45", contextWindow: { validUntil: "2026-07-19T21:00:00.000Z" } });
    expect(activities.get("act-2-8")).toMatchObject({ title: "Caminata nocturna en Puerto Madero", timeWindow: "20:00–20:30", contextWindow: { validUntil: "2026-07-19T23:45:00.000Z" } });
    expect(spots.get("spot-caminito")?.bestTime).toBe("13:00, buscando una esquina tranquila");
    expect(spots.get("spot-puente-mujer")?.bestTime).toBe("20:15, de noche");
  });
});
