import type { StoryPackage } from "../../features/story/engine/types";

export class StoryPackageValidationError extends Error {
  readonly issues: readonly string[];
}
export function validateStoryPackage(raw: unknown): string[];
export function loadStoryPackage(raw: unknown): StoryPackage;
