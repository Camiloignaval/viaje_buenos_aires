import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("banderas de país consistentes", () => {
  it("sirve el font de banderas desde un asset local y lo activa al iniciar", () => {
    const main = readFileSync(resolve(process.cwd(), "src/app/main.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "src/styles/shell.css"), "utf8");
    const font = resolve(process.cwd(), "public/fonts/TwemojiCountryFlags.woff2");

    expect(main).toContain(
      'polyfillCountryFlagEmojis("Twemoji Country Flags", "/fonts/TwemojiCountryFlags.woff2")',
    );
    expect(css).toMatch(/font-family:\s*"Twemoji Country Flags"/);
    expect(statSync(font).size).toBeGreaterThan(70_000);
  });
});
