import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  updateMemory,
} from "@/features/album/data/memoryStore";
import { savePhotoBlob } from "@/features/album/data/photoStore";
import {
  syncNow,
  extractTokenFromUrl,
  saveSyncToken,
  getSyncToken,
  isRemotePhotoUrl,
} from "@/features/sync/syncClient";
import { loadPhotoStatuses } from "@/features/sync/uploadStatusStore";
import {
  calendarDateFrom,
  calendarDaysBetween,
  getChapterReferenceCalendarDate,
  narrativeNowFrom,
  resolveStoryTimezone,
  ChapterStatus,
} from "@/features/story/engine/storyProgress";
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
import type {
  CoverIntroState,
  ExperienceActions,
  ExperienceContextValue,
  PhotoSyncStatus,
} from "../experienceTypes";
import { prefersReducedMotion } from "@/lib/prefersReducedMotion";

export interface UseExperienceResult {
  value: ExperienceContextValue;
  appRef: React.RefObject<HTMLDivElement | null>;
  revealSignature: string;
}

export function useExperience(
  storyPackage: StoryPackage,
  scopeId: string = storyPackage.storyId,
  tripTimezone?: string,
  tripStartDateTime?: string,
): UseExperienceResult {
  // Scope de persistencia: progreso, recuerdos, fotos, intro y tema se keyean
  // por acá. Para un trip conectado es su tripId; para el demo local, el id del
  // propio package. El contenido narrativo lo resuelve getStoryView desde el
  // package — no depende de este scope.
  const scope = scopeId;
  const themeStorageKey = `alaia:${scope}:theme`;
  const introSeenKey = `alaia:intro-video-2-seen:${scope}`;

  // Modo director (SOLO-DEV): `?now=YYYY-MM-DD` congela un "hoy" simulado para
  // previsualizar días que todavía no llegaron. El desbloqueo por fecha compara
  // este `now` contra la fecha de referencia de cada capítulo (ver storyProgress),
  // así que adelantarlo revela los capítulos futuros sin tocar el progreso real.
  // En producción `import.meta.env.DEV` es `false` y el override desaparece del
  // build por dead-code elimination: siempre queda `new Date()`.
  const [searchParams] = useSearchParams();
  const nowOverride = import.meta.env.DEV ? searchParams.get("now") : null;
  const narrativeTimezone = resolveStoryTimezone(storyPackage, tripTimezone);
  const now = useMemo(() => {
    if (nowOverride) {
      const simulated = narrativeNowFrom(nowOverride, narrativeTimezone);
      if (simulated) return simulated;
    }
    return new Date();
  }, [nowOverride, narrativeTimezone]);
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
  // Modo director (SOLO-DEV): al simular una fecha, los capítulos gatean por fecha
  // Y por "capítulo previo completado" (ver unlockRulesDefault). Para previsualizar
  // un día futuro tal como se vería, marcamos como completados —solo en la vista, sin
  // persistir— los capítulos cuya fecha ya pasó en el tiempo simulado. Así el
  // encadenado se abre y el día simulado queda visible. Respeta el progreso real:
  // un capítulo ya iniciado/completado nunca se pisa.
  const chapterStatusesForView = useMemo<ChapterStatuses>(() => {
    if (!nowOverride) return chapterStatuses;
    const simulatedDay = calendarDateFrom(now, narrativeTimezone);
    const overlay: ChapterStatuses = { ...chapterStatuses };
    const allChapters = storyPackage.specialChapter
      ? [...storyPackage.chapters, storyPackage.specialChapter]
      : storyPackage.chapters;
    for (const chapter of allChapters) {
      if (overlay[chapter.id]) continue; // progreso real es pegajoso
      const referenceDay = getChapterReferenceCalendarDate(chapter, storyPackage);
      if (calendarDaysBetween(referenceDay, simulatedDay) > 0) {
        overlay[chapter.id] = ChapterStatus.COMPLETED;
      }
    }
    return overlay;
  }, [nowOverride, now, chapterStatuses, storyPackage, narrativeTimezone]);

  const view: StoryView = useMemo(
    () => getStoryView(storyPackage, { now, chapterStatuses: chapterStatusesForView, timezone: narrativeTimezone, tripStartDateTime }),
    [storyPackage, now, chapterStatusesForView, narrativeTimezone, tripStartDateTime],
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

  // ---- Estado de sincronización por foto (hotfix Épica 5) ----
  // Solo tiene sentido con un accessToken guardado; sin él la app es puramente
  // local y no hay "subida" que mostrar. Regla de verdad: URL remota ⇒ uploaded;
  // id local ⇒ el estado persistido (uploading/failed) o "pending" por defecto.
  const syncEnabled = useMemo(() => {
    try {
      return Boolean(getSyncToken(scope));
    } catch {
      return false;
    }
    // memoriesVersion refresca tras guardar el token desde ?token= y tras cada sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, memoriesVersion]);

  const photoStatuses = useMemo<Record<string, PhotoSyncStatus>>(() => {
    if (!syncEnabled) return {};
    const persisted = loadPhotoStatuses(scope);
    const statuses: Record<string, PhotoSyncStatus> = {};
    for (const id of collectPhotoIds([memories, tripMemories])) {
      statuses[id] = isRemotePhotoUrl(id) ? "uploaded" : persisted[id] ?? "pending";
    }
    return statuses;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, syncEnabled, memories, tripMemories, memoriesVersion]);

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
  // `onProgress` = bumpMemories: refresca la UI en cada cambio de estado de foto
  // (Subiendo…/Sincronizada/Falló) sin esperar a que termine toda la corrida.
  // Siempre se bumpea al final para que un fallo también quede visible.
  const trySyncInBackground = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const merged = await syncNow(scope, bumpMemories);
      if (merged) {
        setChapterStatuses(loadProgress(scope));
      }
    } finally {
      syncingRef.current = false;
      bumpMemories();
    }
  }, [scope, bumpMemories]);

  // Refetch: al montar, al volver online, al recuperar foco/visibilidad y con un
  // polling discreto (20 s) SOLO mientras la página está visible. Sin WebSocket/SSE,
  // sin polling agresivo — reusa el mismo camino local-first de sync.
  useEffect(() => {
    void trySyncInBackground();
    const onOnline = () => void trySyncInBackground();
    const onFocus = () => void trySyncInBackground();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void trySyncInBackground();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void trySyncInBackground();
    }, 20_000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
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
      editMemoryNote(memoryId, note) {
        updateMemory(scope, memoryId, { note });
        bumpMemories();
      },
      async addPhotosToMemory(memoryId, files) {
        const existing = loadMemories(scope).find((memory) => memory.id === memoryId);
        if (!existing) return;
        const newIds: string[] = [];
        for (const file of Array.from(files)) {
          newIds.push(await savePhotoBlob(file));
        }
        if (newIds.length === 0) return;
        updateMemory(scope, memoryId, { photos: [...existing.photos, ...newIds] });
        bumpMemories();
      },
      removeMemoryPhoto(memoryId, photoId) {
        // Solo quita la referencia — nunca destruye el blob (mismo criterio que
        // archiveMemory: el dato subyacente se conserva).
        const existing = loadMemories(scope).find((memory) => memory.id === memoryId);
        if (!existing) return;
        updateMemory(scope, memoryId, {
          photos: existing.photos.filter((id) => id !== photoId),
        });
        bumpMemories();
      },
      reorderMemoryPhotos(memoryId, photoIds) {
        const existing = loadMemories(scope).find((memory) => memory.id === memoryId);
        if (!existing) return;

        const existingIds = new Set(existing.photos);
        const orderedIds = photoIds.filter(
          (photoId, index) => existingIds.has(photoId) && photoIds.indexOf(photoId) === index,
        );
        const remainingIds = existing.photos.filter((photoId) => !orderedIds.includes(photoId));

        updateMemory(scope, memoryId, { photos: [...orderedIds, ...remainingIds] });
        bumpMemories();
      },
      retryPhotoSync() {
        void trySyncInBackground();
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
    trySyncInBackground,
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
    chapterStatuses: chapterStatusesForView,
    now,
    interactive: true,
    theme,
    memories,
    confirmingClose,
    justTransformed,
    photoUrls,
    photoStatuses,
    syncEnabled,
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
    contextualCompanion: null,
    semanticMemoryScope: null,
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
