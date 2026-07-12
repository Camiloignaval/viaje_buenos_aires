// Tipos compartidos por el árbol de componentes de la experience.

import type { Memory } from "@/features/album/data/types";
import type { StoryPackage, StoryView } from "@/features/story/engine/types";
import type { Theme } from "./lib/format";
import type { StagedPhoto } from "./lib/photoSlot";
import type { LockedChapterNotice } from "./lib/lockedChapter";

export type CoverIntroState = "idle" | "video" | "revealing" | "done";

export interface InstallBannerState {
  platform: "ios" | "android";
}

export interface PendingNotification {
  key: string;
  title: string;
  body: string;
}

/** Acciones del usuario — reemplazan la delegación por `data-action` del vanilla. */
export interface ExperienceActions {
  start(chapterId: string): void;
  askClose(): void;
  cancelClose(): void;
  complete(chapterId: string): void;
  toggleTheme(nextTheme: Theme): void;
  openPreparations(): void;
  closePreparations(): void;
  openIndex(): void;
  resumeReading(): void;
  togglePreparation(item: {
    id: string;
    title: string;
    category: string;
    completed: boolean;
  }): void;
  openLockedChapter(chapterId: string, unlockLabel: string): void;
  closeLockedChapter(): void;
  replayIntro(): void;
  createMemory(chapterId: string, activityId: string | null, note: string): void;
  selectPlace(chapterId: string, activityId: string | null, place: string): void;
  selectEpiloguePhoto(chapterId: string, activityId: string | null, photoId: string): void;
  addStagedPhotos(chapterId: string, activityId: string | null, files: FileList): void;
  removeStagedPhoto(chapterId: string, activityId: string | null, tempId: string): void;
  setPrimaryPhoto(chapterId: string, activityId: string | null, tempId: string): void;
  favoriteMemory(memoryId: string): void;
  archiveMemory(memoryId: string): void;
  openAlbum(): void;
  closeAlbum(): void;
  installApp(): void;
  dismissInstall(): void;
  allowNotifications(): void;
  dismissNotificationPrompt(): void;
  registerIntroVideo(el: HTMLVideoElement | null): void;
}

/** Todo lo que el árbol de componentes necesita — espejo de las `options` de renderExperience. */
export interface ExperienceContextValue {
  storyPackage: StoryPackage;
  view: StoryView;
  now: Date;
  interactive: boolean;
  theme: Theme;
  memories: Memory[];
  confirmingClose: boolean;
  justTransformed: boolean;
  photoUrls: Record<string, string>;
  stagedPhotosBySlot: Map<string, StagedPhoto[]>;
  availableTripPhotos: string[];
  showingTripAlbum: boolean;
  indexNavigationOpen: boolean;
  tripMemories: Memory[];
  installBanner: InstallBannerState | null;
  pendingNotification: PendingNotification | null;
  coverIntroState: CoverIntroState;
  lockedChapterNotice: LockedChapterNotice | null;
  showingPreparations: boolean;
  preparationCompletedIds: string[];
  actions: ExperienceActions;
}
