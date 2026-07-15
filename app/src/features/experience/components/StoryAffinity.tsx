import { useExperienceCtx } from "./experienceContext";
import { useFavorites } from "../hooks/useFavorites";
import { useNote } from "../hooks/useNote";
import { NOTE_MAX_LENGTH } from "../lib/notesStore";

// Un corazón discreto: "esto nos llamó la atención". No es un botón grande, ni
// un contador, ni una lista administrativa. Solo aparece en modo interactivo.
export function FavoriteHeart({ targetId, label }: { targetId: string; label: string }) {
  const { interactive } = useExperienceCtx();
  const { isFavorite, toggle } = useFavorites();
  if (!interactive) return null;
  const active = isFavorite(targetId);
  return (
    <button
      type="button"
      className={`favorite-heart${active ? " is-active" : ""}`}
      aria-pressed={active}
      aria-label={active ? `Quitar ${label} de favoritos` : `Marcar ${label} como favorito`}
      onClick={() => toggle(targetId)}
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
    </button>
  );
}

// Nota privada: solo texto, guardado silencioso, crece con el contenido. En modo
// no interactivo muestra la nota escrita (o nada), nunca un editor.
export function PrivateNote({ targetId, placeholder }: { targetId: string; placeholder?: string }) {
  const { interactive } = useExperienceCtx();
  const { text, setText } = useNote(targetId);

  if (!interactive) {
    return text ? <p className="private-note-static">{text}</p> : null;
  }

  return (
    <label className="private-note">
      <span className="private-note-label">Tu nota</span>
      <textarea
        className="private-note-field"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder ?? "Una nota para recordar…"}
        rows={text ? 3 : 1}
        maxLength={NOTE_MAX_LENGTH}
        aria-label="Nota privada"
      />
    </label>
  );
}
