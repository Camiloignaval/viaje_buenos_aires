import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("política PWA de media editorial", () => {
  it("mantiene imágenes y videos fuera del precache obligatorio", () => {
    const config = readFileSync(join(process.cwd(), "vite.config.js"), "utf8");
    const globPatterns = config.match(/globPatterns:\s*\[(.*?)\]/s)?.[1] ?? "";

    expect(globPatterns).not.toMatch(/jpg|jpeg|mp4/);
    expect(globPatterns).not.toMatch(/png/);
    expect(config).toContain('"logo_original.png"');
  });

  it("cachea bajo demanda sólo imágenes de Story y limita la cantidad", () => {
    const sw = readFileSync(join(process.cwd(), "src", "sw.ts"), "utf8");

    expect(sw).toContain('url.pathname.startsWith("/content/stories/")');
    expect(sw).toContain('event.request.destination === "image"');
    expect(sw).toContain("const MAX_STORY_IMAGES = 80");
    expect(sw).not.toMatch(/destination\s*===\s*["']video["']/);
  });
});
