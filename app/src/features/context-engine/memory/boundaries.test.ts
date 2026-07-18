import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { classifyMemory } from "./policy";

const MEMORY_DIRECTORY = path.resolve(process.cwd(), "src/features/context-engine/memory");
const ENGINE_DIRECTORY = path.resolve(process.cwd(), "src/features/context-engine");
const APP_DIRECTORY = path.resolve(process.cwd());

function productionSources(directory: string): string {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => readFileSync(path.join(directory, name), "utf8"))
    .join("\n");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(?:ts|tsx|js)$/u.test(entry.name) && !entry.name.endsWith(".test.ts") ? [fullPath] : [];
  });
}

describe("Memory isolation boundaries", () => {
  it("keeps the pure core free of upstream runtime, UI, delivery, storage, network, AI and logs", () => {
    const source = productionSources(MEMORY_DIRECTORY);
    const banned = [
      /from\s+["'][^"']*(?:livingContext|\/decision|\/companion|\/editorial|\/story)/i,
      /from\s+["']react["']|\/(?:components|ui)\//i,
      /PushCompanion|web-push|sendNotification|authorizeDelivery|cloudinary/i,
      /open-meteo|weatherProvider|\/providers?\/|dynamic.?context/i,
      /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|mongodb|platformMongo|node:(?:fs|http|https)/i,
      /openai|anthropic|\bprompt\b|generateText|chatCompletion|embedding|vector.?db|cron/i,
      /console\.(?:log|warn|error)/i,
    ];

    for (const boundary of banned) expect(source).not.toMatch(boundary);
  });

  it("allows the adapter only established crypto, auth and Mongo infrastructure", () => {
    const source = readFileSync(path.resolve(process.cwd(), "lib/platformMemory.js"), "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/gu)].map((match) => match[1]);

    expect(imports).toEqual(["node:crypto", "./platformAuth.js", "./platformMongo.js"]);
    expect(source).not.toMatch(/console\.|\bfetch\s*\(|cloudinary|open-meteo|weatherProvider|\/providers?\/|openai|prompt|embedding|vector|cron/i);
  });

  it("does not make prior Context Engine or Story modules depend on Memory", () => {
    const priorSource = sourceFiles(ENGINE_DIRECTORY)
      .filter((file) => !file.startsWith(MEMORY_DIRECTORY))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(priorSource).not.toMatch(/from\s+["'][^"']*\/memory(?:\/index)?["']/i);
    expect(priorSource).not.toMatch(/import\s*\(\s*["'][^"']*\/memory(?:\/index)?["']/i);
  });

  it("keeps authoritative upstream ranges byte-unchanged from the Stage 7.6 planning base", () => {
    const changed = execFileSync("git", [
      "-c", `safe.directory=${path.resolve(APP_DIRECTORY, "..").replaceAll("\\", "/")}`,
      "diff", "--name-only", "d6c6a73", "--",
      "src/features/context-engine/livingContext.ts",
      "src/features/context-engine/types.ts",
      "src/features/context-engine/decision",
      "src/features/context-engine/companion",
      "src/features/context-engine/editorial",
      "src/story",
    ], { cwd: APP_DIRECTORY, encoding: "utf8" });

    const authorizedStoryArchitecture = new Set([
      "app/src/story/data/story-ba2026.json",
      "app/src/story/storyPackage/README.md",
      "app/src/story/storyPackage/storyPackage.d.ts",
      "app/src/story/storyPackage/storyPackage.js",
      // Paridad temporal del motor legacy: la zona narrativa por viaje también
      // debe aplicarse a consumidores que aún importan este adapter JS.
      "app/src/story/storyProgress/storyProgress.js",
    ]);
    const unexpected = changed.trim().split(/\r?\n/u)
      .filter(Boolean)
      .filter((file) => !file.endsWith("src/content/stories/buenos-aires-2026/story.json"))
      .filter((file) => !authorizedStoryArchitecture.has(file));

    expect(unexpected).toEqual([]);
  });

  it("does not invoke getters, network or logs for invalid/private input", () => {
    const fetch = vi.fn(() => { throw new Error("network forbidden"); });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetch);
    const input = Object.defineProperty({ source: "authorized_event" }, "accessToken", {
      enumerable: true,
      get: () => { throw new Error("private getter must stay opaque"); },
    });

    const result = classifyMemory(
      { ownerUserId: "user-1", tripId: "trip-1", storyId: null },
      input as never,
      { firstChapterAlreadyOpened: false },
    );

    expect(result).toEqual({ outcome: "discard", reason: "privacy_rejected", type: null });
    expect(fetch).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    log.mockRestore();
  });
});
