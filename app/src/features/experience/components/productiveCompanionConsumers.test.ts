import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");
const modes = readFileSync(join(root, "features/experience/components/Modes.tsx"), "utf8");
const moment = readFileSync(join(root, "features/experience/components/LivingMemoryMoment.tsx"), "utf8");
const experienceCss = readFileSync(join(root, "features/experience/experience.css"), "utf8");
const shellCss = readFileSync(join(root, "styles/shell.css"), "utf8");

describe("productive companion consumer boundaries", () => {
  it("keeps one contextual protagonist between ChapterHero and activities", () => {
    const start = modes.indexOf("<ChapterHero");
    const companion = modes.indexOf("<VisibleCompanionExperience", start);
    const activities = modes.indexOf("<ChapterActivitySequence", companion);
    expect(start).toBeGreaterThan(-1);
    expect(companion).toBeGreaterThan(start);
    expect(activities).toBeGreaterThan(companion);
    expect(modes.match(/<VisibleCompanionExperience/g)).toHaveLength(1);
  });

  it("places one quiet semantic memory after album opening copy and before album groups", () => {
    const album = modes.indexOf("export function TripAlbum");
    const opening = modes.indexOf('className="open reveal reveal-3"', album);
    const memory = modes.indexOf("<LivingMemoryMoment", opening);
    const groups = modes.indexOf("albumGroups.length", memory);
    expect(memory).toBeGreaterThan(opening);
    expect(groups).toBeGreaterThan(memory);
    expect(modes.match(/<LivingMemoryMoment/g)).toHaveLength(1);
    expect(moment).not.toMatch(/aria-live|role="alert"|button|data-memory-id|<time/);
  });

  it("keeps saved memories contextual instead of duplicating them in a chapter album", () => {
    expect(modes).not.toContain("<ChapterAlbum");
  });

  it("preserves fluid, touch, focus and reduced-motion PWA presentation", () => {
    expect(experienceCss).toMatch(/\.active-story-contextual-slot[\s\S]*width: min\(100%, 52rem\)/);
    expect(experienceCss).toMatch(/env\(safe-area-inset-left\)/);
    expect(experienceCss).toMatch(/@media \(max-width: 430px\)/);
    expect(experienceCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(shellCss).toMatch(/\.visible-companion-experience-close[\s\S]*min-width: 44px[\s\S]*min-height: 44px/);
    expect(shellCss).toMatch(/\.visible-companion-experience-close:focus-visible/);
  });
});
