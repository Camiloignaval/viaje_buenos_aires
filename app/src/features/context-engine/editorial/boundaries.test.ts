import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIRECTORY = path.resolve(process.cwd(), "src/features/context-engine/editorial");

function productionSources(): string {
  return readdirSync(DIRECTORY)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => readFileSync(path.join(DIRECTORY, name), "utf8"))
    .join("\n");
}

describe("Editorial Voice Unit 1 boundaries", () => {
  it("does not depend on runtime context, Story, providers, UI, delivery, storage or AI", () => {
    const source = productionSources();
    const banned = [
      /from\s+["']react["']/i,
      /livingContext|\/story\/|open-meteo|\/providers?\//i,
      /orchestrateCompanion|runContextDecisionEngine|\.\/decision/i,
      /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|mongodb/i,
      /PushCompanion|web-push|sendNotification|authorizeDelivery/i,
      /openai|anthropic|prompt|generateText|chatCompletion/i,
      /lib\/companionEngine|lib\\companionEngine/i,
    ];

    for (const boundary of banned) expect(source).not.toMatch(boundary);
  });

  it("keeps the v1 catalog free of interpolation tokens and input identifiers", () => {
    const source = readFileSync(path.join(DIRECTORY, "catalog.ts"), "utf8");
    expect(source).not.toMatch(/\$\{|\{(?:action|decision|trip|user|destination)Id\}/i);
    expect(source).not.toMatch(/\bMath\.random\b|\bDate\.now\b/);
  });
});
