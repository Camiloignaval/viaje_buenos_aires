import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getStoryView,
  StoryMode,
} from "@/features/story/engine/storyEngine";
import {
  loadProgress,
  markChapterStarted,
  markChapterCompleted,
} from "@/features/story/engine/progressStore";
import {
  loadMemories,
  createNoteMemory,
  toggleFavorite,
  archiveMemory,
} from "@/features/album/data/memoryStore";
import { savePhotoBlob } from "@/features/album/data/photoStore";
import { syncNow, extractTokenFromUrl, saveSyncToken } from "@/features/sync/syncClient";
import type { ChapterStatuses, StoryPackage, StoryView } from "@/features/story/engine/types";
import type { Memory } from "@/features/album/data/types";
import { collectPhotoIds, resolvePhotoUrls, tripWidePhotoIds } from "../lib/photoUrls";
import { photoSlotKey } from "../lib/photoSlot";
import type { StagedPhoto } from "../lib/photoSlot";
import { chooseLockedChapterNotice } from "../lib/lockedChapter";
import type { LockedChapterNotice } from "../lib/lockedChapter";
import { normalizeTheme } from "../lib/format";
import type { Theme } from "../lib/format";
import { getChecklistMemories, upsertChecklistMemory } from "../lib/checklistStore";
import type { CoverIntroState, ExperienceActions, ExperienceContextValue } from "../experienceTypes";
import { prefersReducedMotion } from "@/lib/prefersReducedMotion";

export interface UseExperienceResult {
  value: ExperienceContextValue;
  appRef: React.RefObject<HTMLDivElement | null>;
  revealSignature: string;
}

export function useExperience(
  storyPackage: StoryPackage,
  scopeId: string = storyPackage.storyId,
): UseExperienceResult {
  // Scope de persistencia: progreso, recuerdos, fotos, intro y tema se keyean
  // por acá. Para un trip conectado es su tripId; para el demo local, el id del
  // propio package. El contenido narrativo lo resuelve getStoryView desde el
  // package — no depende de este scope.
  const scope = scopeId;
  const themeStorageKey = `alaia:${scope}:theme`;
  const introSeenKey = `alaia:intro-video-2-seen:${scope}`;

  const [now] = useState(() => new Date());
  const [themePref, setThemePref] = useState<Theme>(() => {
    try {
      return localStorage.getItem(themeStorageKey) === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [chapterStatuses, setChapterStatuses] = useState<ChapterStatuses>(() =>
    loadProgress(scope),
  );
  const [coverIntroState, setCoverIntroState] = useState<CoverIntroState>("idle");
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [justTransformed, setJustTransformed] = useState(false);
  const [showingTripAlbum, setShowingTripAlbum] = useState(false);
  const [showingPreparations, setShowingPreparations] = useState(false);
  const [indexNavigationOpen, setIndexNavigationOpen] = useState(false);
  const [lockedChapterNotice, setLockedChapterNotice] = useState<LockedChapterNotice | null>(null);
  const [stagedPhotosBySlot, setStagedPhotosBySlot] = useState<Map<string, StagedPhoto[]>>(
    () => new Map(),
  );
  const [memoriesVersion, setMemoriesVersion] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const appRef = useRef<HTMLDivElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const introTimersRef = useRef<number[]>([]);
  const shouldFocusIndexRef = useRef(false);
  const readingReturnScrollTopRef = useRef<number | null>(null);
  const postRenderRef = useRef<(() => void) | null>(null);
  const activeObjectUrlsRef = useRef<string[]>([]);
  const lastPageKeyRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const bumpMemories = useCallback(() => setMemoriesVersion((v) => v + 1), []);

  // ---- Story view ----
  const view: StoryView = useMemo(
    () => getStoryView(storyPackage, { now, chapterStatuses }),
    [storyPackage, now, chapterStatuses],
  );

  // ---- Memorias (localStorage, sincrónico) ----
  const memories = useMemo<Memory[]>(() => {
    const chapter = view.visibleChapter;
    if (!chapter) return [];
    return loadMemories(scope).filter((memory) => memory.chapterId === chapter.id);
    // memoriesVersion fuerza recarga tras cada CRUD
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, view.visibleChapter, memoriesVersion]);

  const needsTripWide =
    view.currentMode === StoryMode.EPILOGUE || showingTripAlbum;
  const tripMemories = useMemo<Memory[]>(() => {
    return needsTripWide ? loadMemories(scope) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, needsTripWide, memoriesVersion]);

  const availableTripPhotos = useMemo(() => tripWidePhotoIds(tripMemories), [tripMemories]);

  const preparationCompletedIds = useMemo<string[]>(() => {
    if (view.currentMode !== StoryMode.PRE_TRIP) return [];
    return Object.entries(getChecklistMemories())
      .filter(([, memory]) => memory?.completed)
      .map(([id]) => id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.currentMode, memoriesVersion]);

  // ---- Resolución de object URLs de fotos (IndexedDB) ----
  useEffect(() => {
    let cancelled = false;
    const ids = collectPhotoIds([memories, tripMemories]);
    void resolvePhotoUrls(ids).then((urls) => {
      const blobUrls = Object.values(urls).filter((url) => url.startsWith("blob:"));
      if (cancelled) {
        blobUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      activeObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      activeObjectUrlsRef.current = blobUrls;
      setPhotoUrls(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [memories, tripMemories]);

  // Revoca los object URLs vivos al desmontar.
  useEffect(() => {
    return () => {
      activeObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ---- Persistencia real (Épica 5): guarda ?token= una sola vez y lo limpia ----
  useEffect(() => {
    const tokenFromUrl = extractTokenFromUrl();
    if (tokenFromUrl) {
      saveSyncToken(scope, tokenFromUrl);
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url);
    }
  }, [scope]);

  // ---- Intro: timers ----
  const clearIntroTimers = useCallback(() => {
    introTimersRef.current.forEach((id) => window.clearTimeout(id));
    introTimersRef.current = [];
  }, []);

  const scheduleIndexUnlock = useCallback(
    (short = false) => {
      clearIntroTimers();
      const id = window.setTimeout(
        () => {
          setCoverIntroState((state) => {
            if (state !== "revealing") return state;
            shouldFocusIndexRef.current = true;
            return "done";
          });
        },
        short ? 700 : 3200,
      );
      introTimersRef.current = [id];
    },
    [clearIntroTimers],
  );

  const markIntroSeen = useCallback(() => {
    try {
      window.sessionStorage.setItem(introSeenKey, "1");
    } catch {
      /* modo privado: la intro puede repetirse solo en esa sesión degradada */
    }
  }, [introSeenKey]);

  const revealIndexAfterIntro = useCallback(
    ({ short = false }: { short?: boolean } = {}) => {
      markIntroSeen();
      clearIntroTimers();
      setCoverIntroState((state) => {
        if (state === "revealing" || state === "done") return state;
        return "revealing";
      });
      scheduleIndexUnlock(short);
    },
    [markIntroSeen, clearIntroTimers, scheduleIndexUnlock],
  );

  // Inicializa el estado de la intro según el modo (espejo del bloque en renderNow).
  useEffect(() => {
    if (view.currentMode === StoryMode.PRE_TRIP && coverIntroState === "idle") {
      let seen = false;
      try {
        seen = window.sessionStorage.getItem(introSeenKey) === "1";
      } catch {
        seen = false;
      }
      if (seen) {
        setCoverIntroState("done");
      } else if (prefersReducedMotion()) {
        setCoverIntroState("revealing");
        markIntroSeen();
        scheduleIndexUnlock(true);
      } else {
        setCoverIntroState("video");
      }
    } else if (view.currentMode !== StoryMode.PRE_TRIP && coverIntroState !== "done") {
      clearIntroTimers();
      setCoverIntroState("done");
    }
  }, [
    view.currentMode,
    coverIntroState,
    introSeenKey,
    markIntroSeen,
    scheduleIndexUnlock,
    clearIntroTimers,
  ]);

  // Engancha los eventos del video de intro (espejo de attachIntroVideoEvents).
  useEffect(() => {
    if (coverIntroState !== "video") return;
    const video = introVideoRef.current;
    if (!video) {
      revealIndexAfterIntro({ short: true });
      return;
    }
    const finishWithFade = () => {
      video.closest(".cover-index-stage")?.classList.add("is-video-ending");
      const id = window.setTimeout(() => revealIndexAfterIntro(), 3850);
      introTimersRef.current.push(id);
    };
    const fallback = () => revealIndexAfterIntro({ short: true });
    const fallbackIfStillPaused = () => {
      if (video.paused && video.currentTime === 0) fallback();
    };
    video.addEventListener("ended", finishWithFade, { once: true });
    video.addEventListener("error", fallback, { once: true });
    const played = video.play?.();
    if (played && typeof played.catch === "function") {
      played.catch(() => {
        const id = window.setTimeout(fallbackIfStillPaused, 1200);
        introTimersRef.current.push(id);
      });
    }
    return () => {
      video.removeEventListener("ended", finishWithFade);
      video.removeEventListener("error", fallback);
    };
  }, [coverIntroState, revealIndexAfterIntro]);

  // Al terminar la intro (→ done), enfoca el índice del libro de pre-viaje.
  useEffect(() => {
    if (coverIntroState === "done" && shouldFocusIndexRef.current) {
      shouldFocusIndexRef.current = false;
      const preTripBook = appRef.current?.querySelector<HTMLElement>(".book-pretrip");
      if (preTripBook) {
        preTripBook.scrollTop = preTripBook.clientHeight;
      }
    }
  }, [coverIntroState]);

  // ---- Guardas de estado consistentes (espejo del inicio de renderNow) ----
  useEffect(() => {
    if (view.currentMode !== StoryMode.PRE_TRIP && showingPreparations) {
      setShowingPreparations(false);
    } else if (
      view.currentMode === StoryMode.PRE_TRIP &&
      !showingPreparations &&
      indexNavigationOpen
    ) {
      setIndexNavigationOpen(false);
    }
  }, [view.currentMode, showingPreparations, indexNavigationOpen]);

  // ---- Cierre del modal de capítulo bloqueado con Escape ----
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && lockedChapterNotice) {
        setLockedChapterNotice(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lockedChapterNotice]);

  // Foco del botón del modal tras aparecer.
  useEffect(() => {
    if (lockedChapterNotice) {
      appRef.current
        ?.querySelector<HTMLElement>('[data-action="close-locked-chapter"]')
        ?.focus({ preventScroll: true });
    }
  }, [lockedChapterNotice]);

  // ---- Transición page-turn ----
  useEffect(() => {
    const pageKey = showingTripAlbum
      ? "trip-album"
      : showingPreparations
        ? "preparations"
        : view.currentMode;
    if (pageKey === lastPageKeyRef.current) return;
    lastPageKeyRef.current = pageKey;
    const el = appRef.current;
    if (!el) return;
    el.classList.remove("page-turn");
    void el.offsetWidth; // fuerza reflow para reiniciar la animación
    el.classList.add("page-turn");
  }, [view.currentMode, showingTripAlbum, showingPreparations]);

  // ---- Acciones diferidas tras render (scroll/foco) ----
  useEffect(() => {
    if (postRenderRef.current) {
      const fn = postRenderRef.current;
      postRenderRef.current = null;
      fn();
    }
  });

  // ---- Sync en segundo plano (Épica 5) ----
  const trySyncInBackground = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const merged = await syncNow(scope);
      if (merged) {
        setChapterStatuses(loadProgress(scope));
        bumpMemories();
      }
    } finally {
      syncingRef.current = false;
    }
  }, [scope, bumpMemories]);

  useEffect(() => {
    void trySyncInBackground();
    const onOnline = () => void trySyncInBackground();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [trySyncInBackground]);

  // ---- Helpers de scroll (espejo de scrollToReadingPage/scrollCurrentBookTo) ----
  const scrollBookTo = useCallback((target: HTMLElement | null) => {
    const book = appRef.current?.querySelector<HTMLElement>(".book");
    if (!book || !target) return;
    book.scrollTo({ top: target.offsetTop, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  const scrollToReadingPage = useCallback(() => {
    const book = appRef.current?.querySelector<HTMLElement>(".book");
    const readingPage = book
      ? [...book.children].find(
          (child) =>
            child.classList?.contains("book-page") && !child.classList.contains("page-index"),
        )
      : null;
    scrollBookTo((readingPage as HTMLElement) ?? null);
  }, [scrollBookTo]);

  // ---- Acciones ----
  const registerIntroVideo = useCallback((el: HTMLVideoElement | null) => {
    introVideoRef.current = el;
  }, []);

  const actions = useMemo<ExperienceActions>(() => {
    return {
      start(chapterId) {
        setChapterStatuses(markChapterStarted(scope, chapterId));
      },
      askClose() {
        setConfirmingClose(true);
      },
      cancelClose() {
        setConfirmingClose(false);
      },
      complete(chapterId) {
        const isEpilogue = chapterId === storyPackage.specialChapter?.id;
        setChapterStatuses(markChapterCompleted(scope, chapterId));
        setConfirmingClose(false);
        if (isEpilogue) setJustTransformed(true);
      },
      toggleTheme(nextTheme) {
        setThemePref(nextTheme);
        try {
          localStorage.setItem(themeStorageKey, nextTheme);
        } catch {
          /* la preferencia visual no debe romper Alaia si el storage falla */
        }
      },
      openPreparations() {
        setShowingPreparations(true);
        setIndexNavigationOpen(false);
      },
      closePreparations() {
        setShowingPreparations(false);
      },
      openIndex() {
        setConfirmingClose(false);
        setLockedChapterNotice(null);
        setJustTransformed(false);
        readingReturnScrollTopRef.current =
          appRef.current?.querySelector<HTMLElement>(".book")?.scrollTop ?? null;
        setIndexNavigationOpen(true);
      },
      resumeReading() {
        setLockedChapterNotice(null);
        setJustTransformed(false);
        setIndexNavigationOpen(false);
        if (showingTripAlbum) {
          setShowingTripAlbum(false);
          return;
        }
        postRenderRef.current = () => {
          const returnTop = readingReturnScrollTopRef.current;
          if (returnTop !== null) {
            appRef.current
              ?.querySelector<HTMLElement>(".book")
              ?.scrollTo({ top: returnTop, behavior: prefersReducedMotion() ? "auto" : "smooth" });
            readingReturnScrollTopRef.current = null;
          } else {
            scrollToReadingPage();
          }
        };
      },
      togglePreparation(item) {
        void upsertChecklistMemory(item.id, {
          completed: item.completed,
          title: item.title,
          category: item.category,
        });
        bumpMemories();
      },
      openLockedChapter(_chapterId, unlockLabel) {
        setLockedChapterNotice(chooseLockedChapterNotice(unlockLabel));
      },
      closeLockedChapter() {
        setLockedChapterNotice(null);
      },
      replayIntro() {
        clearIntroTimers();
        try {
          window.sessionStorage.removeItem(introSeenKey);
        } catch {
          /* ignore */
        }
        shouldFocusIndexRef.current = false;
        setJustTransformed(false);
        if (prefersReducedMotion()) {
          setCoverIntroState("revealing");
          markIntroSeen();
          scheduleIndexUnlock(true);
        } else {
          setCoverIntroState("video");
        }
      },
      async createMemory(chapterId, activityId, note) {
        const key = photoSlotKey(chapterId, activityId);
        const staged = stagedPhotosBySlot.get(key) ?? [];
        if (!note && staged.length === 0) return;
        const photos: string[] = [];
        for (const photo of staged) {
          photos.push(await savePhotoBlob(photo.file));
        }
        createNoteMemory(scope, chapterId, activityId, note, { photos });
        staged.forEach((photo) => URL.revokeObjectURL(photo.url));
        setStagedPhotosBySlot((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        bumpMemories();
      },
      selectPlace(chapterId, activityId, place) {
        if (!place) return;
        createNoteMemory(scope, chapterId, activityId, place);
        bumpMemories();
      },
      selectEpiloguePhoto(chapterId, activityId, photoId) {
        createNoteMemory(scope, chapterId, activityId, "", { photos: [photoId] });
        bumpMemories();
      },
      addStagedPhotos(chapterId, activityId, files) {
        const key = photoSlotKey(chapterId, activityId);
        const added: StagedPhoto[] = Array.from(files).map((file) => ({
          tempId: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        }));
        setStagedPhotosBySlot((prev) => {
          const next = new Map(prev);
          next.set(key, [...(prev.get(key) ?? []), ...added]);
          return next;
        });
      },
      removeStagedPhoto(chapterId, activityId, tempId) {
        const key = photoSlotKey(chapterId, activityId);
        setStagedPhotosBySlot((prev) => {
          const staged = prev.get(key) ?? [];
          const removed = staged.find((photo) => photo.tempId === tempId);
          if (removed) URL.revokeObjectURL(removed.url);
          const next = new Map(prev);
          next.set(
            key,
            staged.filter((photo) => photo.tempId !== tempId),
          );
          return next;
        });
      },
      setPrimaryPhoto(chapterId, activityId, tempId) {
        const key = photoSlotKey(chapterId, activityId);
        setStagedPhotosBySlot((prev) => {
          const staged = [...(prev.get(key) ?? [])];
          const index = staged.findIndex((photo) => photo.tempId === tempId);
          if (index > 0) {
            const [chosen] = staged.splice(index, 1);
            staged.unshift(chosen);
          }
          const next = new Map(prev);
          next.set(key, staged);
          return next;
        });
      },
      favoriteMemory(memoryId) {
        toggleFavorite(scope, memoryId);
        bumpMemories();
      },
      archiveMemory(memoryId) {
        archiveMemory(scope, memoryId);
        bumpMemories();
      },
      openAlbum() {
        setShowingTripAlbum(true);
        setIndexNavigationOpen(false);
        setJustTransformed(false);
      },
      closeAlbum() {
        setShowingTripAlbum(false);
        setIndexNavigationOpen(false);
      },
      installApp() {
        /* Orquestación de instalación PWA diferida (ver reporte); no-op seguro. */
      },
      dismissInstall() {
        /* idem */
      },
      allowNotifications() {
        /* Notificaciones nativas diferidas (ver reporte); no-op seguro. */
      },
      dismissNotificationPrompt() {
        /* idem */
      },
      registerIntroVideo,
    };
  }, [
    scope,
    storyPackage.specialChapter?.id,
    themeStorageKey,
    introSeenKey,
    stagedPhotosBySlot,
    showingTripAlbum,
    bumpMemories,
    clearIntroTimers,
    markIntroSeen,
    scheduleIndexUnlock,
    scrollToReadingPage,
    registerIntroVideo,
  ]);

  // ---- Tema final (espejo del cálculo de theme en renderExperience) ----
  const readingIndexOpen =
    indexNavigationOpen &&
    !showingTripAlbum &&
    !showingPreparations &&
    view.currentMode !== StoryMode.PRE_TRIP;
  const themeablePage =
    showingTripAlbum || showingPreparations || view.currentMode !== StoryMode.PRE_TRIP;
  const theme: Theme = readingIndexOpen
    ? "dark"
    : themeablePage
      ? normalizeTheme(themePref)
      : "dark";

  const value: ExperienceContextValue = {
    storyPackage,
    scopeId: scope,
    view,
    now,
    interactive: true,
    theme,
    memories,
    confirmingClose,
    justTransformed,
    photoUrls,
    stagedPhotosBySlot,
    availableTripPhotos,
    showingTripAlbum,
    indexNavigationOpen,
    tripMemories,
    installBanner: null,
    pendingNotification: null,
    coverIntroState,
    lockedChapterNotice,
    showingPreparations,
    preparationCompletedIds,
    actions,
  };

  const revealSignature = [
    view.currentMode,
    view.visibleChapter?.id ?? "",
    showingPreparations,
    showingTripAlbum,
    indexNavigationOpen,
    coverIntroState,
    memoriesVersion,
  ].join("|");

  return { value, appRef, revealSignature };
}
