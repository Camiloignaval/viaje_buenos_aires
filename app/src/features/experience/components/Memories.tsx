import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useExperienceCtx } from "./experienceContext";
import { MemoryLightbox } from "./MemoryLightbox";
import type { Memory } from "@/features/album/data/types";
import type { StagedPhoto } from "../lib/photoSlot";

function formatMemoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
    .replaceAll(".", "")
    .toLocaleUpperCase("es-AR");
}

function AlbumMemoryPhotos({ memory }: { memory: Memory }) {
  const { photoUrls } = useExperienceCtx();
  const photos = (memory.photos ?? []).filter((id) => Boolean(photoUrls[id]));
  if (photos.length === 0) return null;
  return (
    <div className="memory-photos">
      {photos.map((id, index) => (
        <img key={id} className={index === 0 ? "memory-photo-primary" : "memory-photo-thumb"} src={photoUrls[id]} alt="" />
      ))}
    </div>
  );
}

// Glifos del estuche — "marcas del editor": line-art de latón, misma familia que
// los enlaces del libro. Reemplazan los enlaces de texto del menú de opciones.
const G_MARKS = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 8h14M5 12h14M5 16h10" /></svg>
);
const G_NIB = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19l1.5-4.5L16 5l3 3-9.5 9.5L5 19z" /><path d="M14 7l3 3" /></svg>
);
const G_CAMERA = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="7" width="18" height="13" rx="1" /><path d="M8.5 7l1.5-2.5h4L15.5 7" /><circle cx="12" cy="13.5" r="3" /></svg>
);
const G_STACK = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8l8-4 8 4-8 4-8-4z" /><path d="M4 12l8 4 8-4" /></svg>
);
const G_SEND = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 14V4" /><path d="M8.5 7.5L12 4l3.5 3.5" /><path d="M6 12v7h12v-7" /></svg>
);
const G_PEEL = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4h7l4 4v12H7z" /><path d="M14 4v4h4" /></svg>
);
const G_CLOSE = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

// El PLIEGO: composición editorial DETERMINISTA según la cantidad de fotos.
// 1 lámina · 2 dúo · 3 hero+2 · 4 hero+fila de 3 · 5-6 hero+grilla · 7+ hero+3+«+N».
// Ninguna foto se oculta antes del límite; «+N» aparece SOLO cuando de verdad
// sobran (a partir de la 7.ª). Cada lámina abre el visor en su foto.
type MemoryPliegoLayout = "single" | "duo" | "hero-two" | "hero-row-three" | "hero-grid" | "hero-overflow";

export function resolveMemoryPliego(count: number): {
  layout: MemoryPliegoLayout;
  bucket: 1 | 2 | 3 | 4 | 6 | 7;
  visibleCount: number;
  overflow: number;
} {
  if (count <= 1) return { layout: "single", bucket: 1, visibleCount: count, overflow: 0 };
  if (count === 2) return { layout: "duo", bucket: 2, visibleCount: 2, overflow: 0 };
  if (count === 3) return { layout: "hero-two", bucket: 3, visibleCount: 3, overflow: 0 };
  if (count === 4) return { layout: "hero-row-three", bucket: 4, visibleCount: 4, overflow: 0 };
  if (count <= 6) return { layout: "hero-grid", bucket: 6, visibleCount: count, overflow: 0 };
  return { layout: "hero-overflow", bucket: 7, visibleCount: 4, overflow: count - 4 };
}

function MemoryPliego({ photos, onOpen }: { photos: { id: string; url: string }[]; onOpen: (index: number) => void }) {
  const n = photos.length;
  const composition = resolveMemoryPliego(n);
  const visible = photos.slice(0, composition.visibleCount);
  return (
    <div
      className={`memory-pliego pliego-${composition.bucket}`}
      data-layout={composition.layout}
      data-photo-count={n}
      data-visible-count={composition.visibleCount}
      data-overflow={composition.overflow}
    >
      {visible.map((photo, index) => {
        const isMore = composition.overflow > 0 && index === visible.length - 1;
        return (
          <button
            key={photo.id}
            type="button"
            className={`pliego-tile${isMore ? " pliego-more" : ""}`}
            data-more={isMore ? composition.overflow : undefined}
            aria-label={
              isMore
                ? `Ver ${composition.overflow} fotos adicionales, ${n} en total`
                : `Abrir la foto ${index + 1} de ${n}`
            }
            onClick={() => onOpen(isMore ? composition.visibleCount : index)}
          >
            <img src={photo.url} alt="" />
          </button>
        );
      })}
    </div>
  );
}

type SavedMemoryMode = "view" | "editing" | "confirming-delete";

export function SavedMemory({ memory, dateLabel }: { memory: Memory; dateLabel?: string }) {
  const { actions, photoUrls } = useExperienceCtx();
  const [mode, setMode] = useState<SavedMemoryMode>("view");
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(memory.note);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [managingPhotos, setManagingPhotos] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const addPhotosInputRef = useRef<HTMLInputElement>(null);
  const whisperRef = useRef<HTMLDivElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedPhotos = (memory.photos ?? [])
    .map((id) => ({ id, url: photoUrls[id] }))
    .filter((photo): photo is { id: string; url: string } => Boolean(photo.url));
  const memoryStamp = (dateLabel ?? formatMemoryDate(memory.createdAt)).toLocaleUpperCase("es-AR");

  const reorderPhoto = (photoId: string, direction: -1 | 1) => {
    const next = [...(memory.photos ?? [])];
    const from = next.indexOf(photoId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    actions.reorderMemoryPhotos(memory.id, next);
  };

  const usePhotoAsHero = (photoId: string) => {
    const next = (memory.photos ?? []).filter((id) => id !== photoId);
    actions.reorderMemoryPhotos(memory.id, [photoId, ...next]);
  };

  useEffect(() => {
    if (!whisperOpen && mode !== "confirming-delete") return;
    requestAnimationFrame(() => whisperRef.current?.querySelector<HTMLElement>("button, textarea")?.focus());
  }, [mode, whisperOpen]);

  useEffect(() => () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }, []);

  useEffect(() => {
    if (!whisperOpen || mode === "confirming-delete") return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (whisperRef.current?.contains(target) || optionsButtonRef.current?.contains(target)) return;
      setWhisperOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [mode, whisperOpen]);

  const closeWhisper = () => {
    setWhisperOpen(false);
    if (mode === "confirming-delete") setMode("view");
    requestAnimationFrame(() => optionsButtonRef.current?.focus());
  };

  const trapWhisperFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeWhisper();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = whisperRef.current?.querySelectorAll<HTMLElement>(
      'button, textarea, [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const beginLongPress = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, textarea, input")) return;
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => setWhisperOpen(true), 560);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  const finishEditing = () => {
    const next = draftNote.trim();
    if (next !== memory.note) actions.editMemoryNote(memory.id, next);
    setMode("view");
  };

  const shareMemory = async () => {
    const text = memory.note || "Un recuerdo guardado en Alaia";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Un recuerdo de nuestro viaje", text, url: window.location.href });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      }
      setShareStatus("Listo para compartir.");
    } catch {
      setShareStatus("El recuerdo se conserva acá.");
    }
    setWhisperOpen(false);
  };

  return (
    <div
      className={`memory-slot memory-slot-saved${mode === "view" ? "" : " is-active"}`}
      onPointerDown={beginLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
    >
      <div className="memory-object">
        {resolvedPhotos.length > 0 ? (
          <MemoryPliego
            photos={resolvedPhotos}
            onOpen={(index) => {
              setManagingPhotos(false);
              setLightboxIndex(index);
            }}
          />
        ) : (
          <div className="memory-lamina memory-lamina-written" aria-label="Recuerdo escrito sin fotografía" />
        )}
        {mode === "editing" ? (
          <textarea
            className="memory-note-input memory-note-editing"
            aria-label="Retocar la línea del recuerdo"
            autoFocus
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
            onBlur={finishEditing}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraftNote(memory.note);
                setMode("view");
              }
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
        ) : memory.note ? (
          <MemoryNote note={memory.note} />
        ) : null}
        <p className="memory-date-stamp"><span aria-hidden="true">—</span> {memoryStamp} <span aria-hidden="true">—</span></p>
      </div>

      <button
        ref={optionsButtonRef}
        type="button"
        className="memory-reach-affordance"
        aria-label="Opciones del recuerdo"
        aria-expanded={whisperOpen || mode === "confirming-delete"}
        onClick={() => setWhisperOpen((open) => !open)}
      >
        {G_MARKS}
      </button>

      {whisperOpen || mode === "confirming-delete" ? (
        <div
          ref={whisperRef}
          className={`memory-whisper${mode === "confirming-delete" ? "" : " memory-whisper-ribbon"}`}
          role="dialog"
          aria-modal="true"
          aria-label="Opciones discretas del recuerdo"
          onKeyDown={trapWhisperFocus}
        >
          {mode === "confirming-delete" ? (
            <>
              <p>¿Eliminar este recuerdo? Puedes conservarlo.</p>
              <div className="memory-whisper-actions">
                <button type="button" onClick={closeWhisper}>Conservar</button>
                <button type="button" onClick={() => actions.archiveMemory(memory.id)}>Eliminar</button>
              </div>
            </>
          ) : (
            <div className="memory-marks">
              <button type="button" className="memory-mark" aria-label="retocar la línea" title="Retocar la línea" onClick={() => {
                setDraftNote(memory.note);
                setMode("editing");
                setWhisperOpen(false);
              }}>{G_NIB}</button>
              <button type="button" className="memory-mark" aria-label="sumar una foto" title="Sumar una foto" onClick={() => addPhotosInputRef.current?.click()}>{G_CAMERA}</button>
              {resolvedPhotos.length > 1 ? (
                <button type="button" className="memory-mark" aria-label="reordenar las fotos" title="Reordenar las fotos" onClick={() => {
                  setManagingPhotos(true);
                  setLightboxIndex(0);
                  setWhisperOpen(false);
                }}>{G_STACK}</button>
              ) : null}
              <button type="button" className="memory-mark" aria-label="compartirlo aparte" title="Compartir" onClick={shareMemory}>{G_SEND}</button>
              <button type="button" className="memory-mark" aria-label="eliminar el recuerdo" title="Eliminar" onClick={() => setMode("confirming-delete")}>{G_PEEL}</button>
              <button type="button" className="memory-mark" aria-label="seguir leyendo" title="Seguir leyendo" onClick={closeWhisper}>{G_CLOSE}</button>
            </div>
          )}
        </div>
      ) : null}

      <input
        ref={addPhotosInputRef}
        type="file"
        accept="image/*"
        multiple
        className="add-photos-input"
        aria-label="Sumar fotos a este recuerdo"
        onChange={(event) => {
          if (event.target.files?.length) actions.addPhotosToMemory(memory.id, event.target.files);
          event.target.value = "";
          setWhisperOpen(false);
        }}
      />
      <p className="sr-only" aria-live="polite">{shareStatus}</p>

      {lightboxIndex !== null ? (
        <MemoryLightbox
          photos={resolvedPhotos.map(({ url }) => url)}
          initialIndex={lightboxIndex}
          onClose={() => {
            setLightboxIndex(null);
            setManagingPhotos(false);
          }}
          onRemove={managingPhotos ? (index) => {
            const photo = resolvedPhotos[index];
            if (photo) actions.removeMemoryPhoto(memory.id, photo.id);
          } : undefined}
          onMovePrevious={managingPhotos ? (index) => {
            const photo = resolvedPhotos[index];
            if (photo) reorderPhoto(photo.id, -1);
          } : undefined}
          onMoveNext={managingPhotos ? (index) => {
            const photo = resolvedPhotos[index];
            if (photo) reorderPhoto(photo.id, 1);
          } : undefined}
          onUseAsHero={managingPhotos ? (index) => {
            const photo = resolvedPhotos[index];
            if (photo) usePhotoAsHero(photo.id);
          } : undefined}
        />
      ) : null}
    </div>
  );
}

// Previsualización de las fotos que se están montando. El disparador para AÑADIR
// vive en MemoryInvitation (una sola entrada de archivos, compartida por el cue
// "foto" de la hoja vacía y por "sumar una foto" del editor).
function splitLongMemoryNote(note: string): { accent: string; body: string } {
  const sentence = note.match(/^(.{1,80}?[.!?])(?:\s+|$)(.*)$/s);
  if (sentence) return { accent: sentence[1], body: sentence[2] };
  const boundary = note.slice(0, 52).lastIndexOf(" ");
  const cut = boundary >= 24 ? boundary : Math.min(42, note.length);
  return { accent: note.slice(0, cut), body: note.slice(cut).trimStart() };
}

function MemoryNote({ note }: { note: string }) {
  if (note.length <= 140) return <p className="memory-note">{note}</p>;
  const { accent, body } = splitLongMemoryNote(note);
  return (
    <p className="memory-note memory-note-long">
      <span className="memory-note-accent">{accent}</span>
      {body ? <> <span className="memory-note-body">{body}</span></> : null}
    </p>
  );
}

function PhotoStaging({ chapterId, activityId, staged }: { chapterId: string; activityId: string | null; staged: StagedPhoto[] }) {
  const { actions } = useExperienceCtx();
  if (staged.length === 0) return null;
  return (
    <ul className="staged-photos" aria-label="Fotos que se están montando">
      {staged.map((photo, index) => (
        <li key={photo.tempId} className={`staged-photo${index === 0 ? " is-primary" : ""}`}>
          <img src={photo.url} alt={`Vista previa ${index + 1} del recuerdo`} />
          {index > 0 ? (
            <button type="button" onClick={() => actions.setPrimaryPhoto(chapterId, activityId, photo.tempId)}>
              usar adelante
            </button>
          ) : null}
          <button type="button" onClick={() => actions.removeStagedPhoto(chapterId, activityId, photo.tempId)}>
            eliminar esta foto
          </button>
        </li>
      ))}
    </ul>
  );
}

interface MemoryInvitationProps {
  chapterId: string;
  activityId: string | null;
  question?: string;
  hint?: string;
  staged?: StagedPhoto[];
  /** Línea manuscrita del hueco vacío. Varía por lugar para no repetir la misma
      frase en cada bloque (evita la monotonía de "el mismo óvalo, el mismo texto"). */
  whisper?: string;
}

export function MemoryInvitation({
  chapterId,
  activityId,
  question = "",
  hint = "",
  staged = [],
  whisper = "Aquí vivirá uno de nuestros recuerdos",
}: MemoryInvitationProps) {
  const { actions } = useExperienceCtx();
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [settling, setSettling] = useState(false);
  const [openerKind, setOpenerKind] = useState<"write" | "photo" | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState(false);
  const savingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const writeBtnRef = useRef<HTMLButtonElement>(null);
  const photoBtnRef = useRef<HTMLButtonElement>(null);
  const canSettle = note.trim().length > 0 || staged.length > 0;

  // Se asienta sola: sin botón guardar, al reposar la escritura una línea.
  useEffect(() => {
    if (!writing || !canSettle || savingRef.current) return;
    const timer = setTimeout(() => {
      savingRef.current = true;
      setSettling(true);
      actions.createMemory(chapterId, activityId, note.trim());
    }, 900);
    return () => clearTimeout(timer);
  }, [actions, activityId, canSettle, chapterId, note, staged.length, writing]);

  // Autogrow real: la línea crece con el contenido, sin altura fija ni scroll
  // hasta un máximo. Fallback aislado en React, sin dependencias, estable en mobile.
  const grow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };
  useEffect(() => {
    if (writing) grow();
  }, [writing, note]);

  // "foto" abre el selector directamente al entrar en el estado de escritura.
  useEffect(() => {
    if (writing && pendingPhoto) {
      fileRef.current?.click();
      setPendingPhoto(false);
    }
  }, [writing, pendingPhoto]);

  // Cerrar sin guardar: vuelve a la hoja en espera. No persiste un recuerdo; el
  // borrador local (texto/fotos) queda en memoria; el foco regresa al disparador.
  const closeEditor = () => setWriting(false);
  useEffect(() => {
    if (writing || !openerKind) return;
    const opener = openerKind === "write" ? writeBtnRef.current : photoBtnRef.current;
    const raf = requestAnimationFrame(() => opener?.focus());
    setOpenerKind(null);
    return () => cancelAnimationFrame(raf);
  }, [writing, openerKind]);

  const hiddenFileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      multiple
      className="add-photos-input"
      aria-label="Elegir fotos para este recuerdo"
      onChange={(event) => {
        if (event.target.files?.length) actions.addStagedPhotos(chapterId, activityId, event.target.files);
        event.target.value = "";
      }}
    />
  );

  if (!writing) {
    return (
      <div className="memory-slot memory-slot-invitation">
        {question ? <p className="memory-invitation-question">{question}</p> : null}
        <div className="memory-hoja">
          <p className="memory-empty-whisper">{whisper}</p>
          <div className="memory-hoja-cues">
            <button
              ref={writeBtnRef}
              type="button"
              className="memory-cue"
              aria-label="Escribir un recuerdo de este momento"
              onClick={() => {
                setOpenerKind("write");
                setWriting(true);
              }}
            >
              <span className="memory-cue-glyph" aria-hidden="true">✎</span>escribir
            </button>
            <button
              ref={photoBtnRef}
              type="button"
              className="memory-cue"
              aria-label="Sumar una foto a este momento"
              onClick={() => {
                setOpenerKind("photo");
                setPendingPhoto(true);
                setWriting(true);
              }}
            >
              <span className="memory-cue-glyph" aria-hidden="true">＋</span>foto
            </button>
          </div>
        </div>
        {hint ? <p className="memory-invitation-hint">{hint}</p> : null}
        {hiddenFileInput}
      </div>
    );
  }

  return (
    <div className={`memory-slot memory-slot-invitation is-writing${settling ? " is-settling" : ""}`}>
      <div
        className="memory-hoja memory-hoja-composing"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            closeEditor();
          }
        }}
      >
        <textarea
          ref={textareaRef}
          className="memory-note-input memory-ink-line"
          aria-label="Escribir lo que quieren recordar de este momento"
          autoFocus
          rows={1}
          placeholder="¿Qué hizo especial este momento?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onInput={grow}
        />
        <PhotoStaging chapterId={chapterId} activityId={activityId} staged={staged} />
        <div className="memory-hoja-actions">
          <button type="button" className="memory-hoja-add" onClick={() => fileRef.current?.click()}>
            <span className="memory-cue-glyph" aria-hidden="true">＋</span>sumar una foto
          </button>
          <button
            type="button"
            className="memory-hoja-close"
            aria-label="Cerrar sin guardar"
            onClick={closeEditor}
          >
            cerrar
          </button>
        </div>
      </div>
      <p className="memory-settling-status" aria-live="polite">
        {settling ? "El recuerdo se está asentando en la hoja." : "Se asentará solo cuando haya una línea o una foto."}
      </p>
      {hiddenFileInput}
    </div>
  );
}

export function MemoryCard({ memory, contextLabel }: { memory: Memory; contextLabel?: string }) {
  return (
    <li className="memory-card">
      {memory.favorite ? (
        <span className="memory-card-favorite" aria-label="Favorito">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 3l2.5 5.2 5.7.8-4.1 4 1 5.7L12 21l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
          </svg>
        </span>
      ) : null}
      {contextLabel ? <p className="memory-card-context">{contextLabel}</p> : null}
      <AlbumMemoryPhotos memory={memory} />
      {memory.note ? <p className="memory-card-note">{memory.note}</p> : null}
    </li>
  );
}
