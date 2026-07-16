import { useId, useState } from "react";
import { useExperienceCtx } from "./experienceContext";
import type { Memory } from "@/features/album/data/types";
import type { StagedPhoto } from "../lib/photoSlot";

// Espejo de renderMemoryPhotos: la primera del array es siempre la principal.
export function MemoryPhotos({ memory }: { memory: Memory }) {
  const { photoUrls } = useExperienceCtx();
  const photos = memory.photos ?? [];
  if (photos.length === 0) {
    return null;
  }
  const [primaryId, ...restIds] = photos;
  return (
    <div className="memory-photos">
      {photoUrls[primaryId] ? (
        <img className="memory-photo-primary" src={photoUrls[primaryId]} alt="" />
      ) : null}
      {restIds.map((id) =>
        photoUrls[id] ? (
          <img key={id} className="memory-photo-thumb" src={photoUrls[id]} alt="" />
        ) : null,
      )}
    </div>
  );
}

// Espejo de renderSavedMemory: un recuerdo ya guardado, donde antes estaba la invitación.
export function SavedMemory({ memory }: { memory: Memory }) {
  const { actions } = useExperienceCtx();
  return (
    <div className="memory-slot memory-slot-saved">
      <MemoryPhotos memory={memory} />
      {memory.note ? <p className="memory-note">{memory.note}</p> : null}
      <div className="memory-actions">
        <button
          type="button"
          data-memory-id={memory.id}
          aria-pressed={memory.favorite}
          aria-label={
            memory.favorite
              ? "Quitar de nuestros recuerdos favoritos"
              : "Guardar entre nuestros recuerdos favoritos"
          }
          onClick={() => actions.favoriteMemory(memory.id)}
        >
          {memory.favorite ? "♥ Uno de nuestros favoritos" : "♡ Guardar entre favoritos"}
        </button>
      </div>
    </div>
  );
}

// Espejo de renderPhotoStaging: miniaturas de fotos aún sin guardar + "Sumar fotos".
function PhotoStaging({
  chapterId,
  activityId,
  staged,
}: {
  chapterId: string;
  activityId: string | null;
  staged: StagedPhoto[];
}) {
  const { actions } = useExperienceCtx();
  const inputId = useId();
  return (
    <div className="photo-staging">
      {staged.length > 0 ? (
        <ul className="staged-photos">
          {staged.map((photo, index) => (
            <li key={photo.tempId} className={`staged-photo${index === 0 ? " is-primary" : ""}`}>
              <img src={photo.url} alt={`Vista previa ${index + 1} del recuerdo`} />
              <div className="staged-photo-actions">
                {index === 0 ? (
                  <span className="staged-photo-label">Esta abre el recuerdo</span>
                ) : (
                  <button
                    type="button"
                    data-chapter-id={chapterId}
                    data-activity-id={activityId ?? ""}
                    data-temp-id={photo.tempId}
                    onClick={() => actions.setPrimaryPhoto(chapterId, activityId, photo.tempId)}
                  >
                    Que esta abra el recuerdo
                  </button>
                )}
                <button
                  type="button"
                  data-chapter-id={chapterId}
                  data-activity-id={activityId ?? ""}
                  data-temp-id={photo.tempId}
                  onClick={() => actions.removeStagedPhoto(chapterId, activityId, photo.tempId)}
                >
                  No incluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="add-photos-label" htmlFor={inputId}>
        Elegir fotos
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="add-photos-input"
          aria-label="Elegir fotos para este recuerdo"
          data-chapter-id={chapterId}
          data-activity-id={activityId ?? ""}
          onChange={(event) => {
            if (event.target.files && event.target.files.length > 0) {
              actions.addStagedPhotos(chapterId, activityId, event.target.files);
            }
          }}
        />
      </label>
    </div>
  );
}

interface MemoryInvitationProps {
  chapterId: string;
  activityId: string | null;
  question?: string;
  hint?: string;
  staged?: StagedPhoto[];
}

// Espejo de renderMemoryInvitation. La nota vive en estado local (controlado): a
// diferencia del vanilla, agregar una foto NO borra el texto ya escrito.
export function MemoryInvitation({
  chapterId,
  activityId,
  question = "¿Quieren guardar este momento?",
  hint = "",
  staged = [],
}: MemoryInvitationProps) {
  const { actions } = useExperienceCtx();
  const [note, setNote] = useState("");
  const canSave = note.trim().length > 0 || staged.length > 0;
  return (
    <div className="memory-slot memory-slot-invitation">
      {question ? <p className="memory-invitation-question">{question}</p> : null}
      {hint ? <p className="memory-invitation-hint">{hint}</p> : null}
      <textarea
        className="memory-note-input"
        aria-label="Qué quieren recordar de este momento"
        placeholder="¿Qué les gustaría recordar de este momento?"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <PhotoStaging chapterId={chapterId} activityId={activityId} staged={staged} />
      <button
        type="button"
        data-chapter-id={chapterId}
        data-activity-id={activityId ?? ""}
        disabled={!canSave}
        onClick={() => actions.createMemory(chapterId, activityId, note.trim())}
      >
        Guardar el momento
      </button>
    </div>
  );
}

// Espejo de renderMemoryCard: tarjeta de solo lectura para álbumes.
export function MemoryCard({ memory, contextLabel }: { memory: Memory; contextLabel?: string }) {
  return (
    <li className="memory-card">
      {memory.favorite ? <span className="memory-card-favorite">♥</span> : null}
      {contextLabel ? <p className="memory-card-context">{contextLabel}</p> : null}
      <MemoryPhotos memory={memory} />
      {memory.note ? <p className="memory-card-note">{memory.note}</p> : null}
    </li>
  );
}
