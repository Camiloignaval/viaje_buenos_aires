import { useState } from "react";
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
          onClick={() => actions.favoriteMemory(memory.id)}
        >
          {memory.favorite ? "♥ Recuerdo favorito" : "♥ Dejar como favorito"}
        </button>
        <button
          type="button"
          data-memory-id={memory.id}
          onClick={() => actions.archiveMemory(memory.id)}
        >
          Dejar aparte
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
  return (
    <div className="photo-staging">
      {staged.length > 0 ? (
        <ul className="staged-photos">
          {staged.map((photo, index) => (
            <li key={photo.tempId} className={`staged-photo${index === 0 ? " is-primary" : ""}`}>
              <img src={photo.url} alt="" />
              <div className="staged-photo-actions">
                {index === 0 ? (
                  <span className="staged-photo-label">Principal</span>
                ) : (
                  <button
                    type="button"
                    data-chapter-id={chapterId}
                    data-activity-id={activityId ?? ""}
                    data-temp-id={photo.tempId}
                    onClick={() => actions.setPrimaryPhoto(chapterId, activityId, photo.tempId)}
                  >
                    Elegir como principal
                  </button>
                )}
                <button
                  type="button"
                  data-chapter-id={chapterId}
                  data-activity-id={activityId ?? ""}
                  data-temp-id={photo.tempId}
                  onClick={() => actions.removeStagedPhoto(chapterId, activityId, photo.tempId)}
                >
                  Sacar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="add-photos-label">
        + Sumar fotos
        <input
          type="file"
          accept="image/*"
          multiple
          className="add-photos-input"
          data-chapter-id={chapterId}
          data-activity-id={activityId ?? ""}
          hidden
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
  quiet?: boolean;
}

// Espejo de renderMemoryInvitation. La nota vive en estado local (controlado): a
// diferencia del vanilla, agregar una foto NO borra el texto ya escrito.
export function MemoryInvitation({
  chapterId,
  activityId,
  question = "",
  hint = "",
  staged = [],
  quiet = false,
}: MemoryInvitationProps) {
  const { actions } = useExperienceCtx();
  const [note, setNote] = useState("");
  const engaged = !quiet || staged.length > 0;
  return (
    <div className={`memory-slot memory-slot-invitation${quiet ? " memory-slot-quiet" : ""}`}>
      {question ? <p className="memory-invitation-question">{question}</p> : null}
      {hint ? <p className="memory-invitation-hint">{hint}</p> : null}
      {engaged ? (
        <textarea
          className="memory-note-input"
          placeholder="Escribí algo que quieras recordar..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      ) : null}
      <PhotoStaging chapterId={chapterId} activityId={activityId} staged={staged} />
      {engaged ? (
        <button
          type="button"
          data-chapter-id={chapterId}
          data-activity-id={activityId ?? ""}
          onClick={() => actions.createMemory(chapterId, activityId, note.trim())}
        >
          Guardar este recuerdo
        </button>
      ) : null}
    </div>
  );
}

// Espejo de renderMemoryCard: tarjeta de solo lectura para álbumes.
export function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <li className="memory-card">
      {memory.favorite ? <span className="memory-card-favorite">♥</span> : null}
      <MemoryPhotos memory={memory} />
      {memory.note ? <p className="memory-card-note">{memory.note}</p> : null}
    </li>
  );
}
