// Proyección TypeScript del único contrato runtime, compartido con backend y Studio.
import { loadStoryPackage as loadCanonicalStoryPackage } from "../../../story/storyPackage/storyPackage.js";
import type { StoryPackage } from "./types";

export { StoryPackageValidationError, validateStoryPackage } from "../../../story/storyPackage/storyPackage.js";

export function loadStoryPackage(raw: unknown): StoryPackage {
  return loadCanonicalStoryPackage(raw) as StoryPackage;
}
