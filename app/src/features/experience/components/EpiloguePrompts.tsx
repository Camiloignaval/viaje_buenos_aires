import { useState } from "react";
import { useExperienceCtx } from "./experienceContext";
import { SavedMemory } from "./Memories";
import type { EpiloguePrompt, StoryPackage } from "@/features/story/engine/types";
import type { Memory } from "@/features/album/data/types";

function isPhotoPrompt(prompt: EpiloguePrompt): boolean {
  return prompt.memoryType === "photo" || prompt.sourceCategory === "photo";
}

// Espejo de renderTextPrompt: degradación con gracia a palabras.
function TextPrompt({ prompt, chapterId }: { prompt: EpiloguePrompt; chapterId: string }) {
  const { actions } = useExperienceCtx();
  const [note, setNote] = useState("");
  const question = prompt.creationPrompt ?? prompt.selectionPrompt ?? "";
  return (
    <div className="memory-slot memory-slot-invitation">
      <p className="section-title">{prompt.label}</p>
      <p className="memory-invitation-question">{question}</p>
      {isPhotoPrompt(prompt) ? (
        <p className="memory-invitation-hint">Por ahora, esto se guarda con tus palabras.</p>
      ) : null}
      <textarea
        className="memory-note-input"
        placeholder="Escribe algo que quieras recordar..."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <button
        type="button"
        data-chapter-id={chapterId}
        data-activity-id={prompt.id}
        onClick={() => actions.createMemory(chapterId, prompt.id, note.trim())}
      >
        Guardar este recuerdo
      </button>
    </div>
  );
}

// Espejo de renderPlacePrompt: selección de un lugar real, no texto libre.
function PlacePrompt({
  prompt,
  chapterId,
  storyPackage,
}: {
  prompt: EpiloguePrompt;
  chapterId: string;
  storyPackage: StoryPackage;
}) {
  const { actions } = useExperienceCtx();
  const catalog = storyPackage.placesCatalog ?? {};
  const places = prompt.sourceCategory === "cafes" ? catalog.cafes ?? [] : catalog.restaurants ?? [];
  const [selected, setSelected] = useState(places[0]?.name ?? "");
  if (places.length === 0) {
    return <TextPrompt prompt={prompt} chapterId={chapterId} />;
  }
  return (
    <div className="memory-slot memory-slot-invitation">
      <p className="section-title">{prompt.label}</p>
      <p className="memory-invitation-question">{prompt.selectionPrompt ?? ""}</p>
      <select
        className="memory-place-select"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
      >
        {places.map((place) => (
          <option key={place.id} value={place.name}>
            {place.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        data-chapter-id={chapterId}
        data-activity-id={prompt.id}
        onClick={() => actions.selectPlace(chapterId, prompt.id, selected)}
      >
        Quedarme con esta
      </button>
    </div>
  );
}

// Espejo de renderPhotoSelectionPrompt: elige entre las fotos reales del viaje.
function PhotoSelectionPrompt({ prompt, chapterId }: { prompt: EpiloguePrompt; chapterId: string }) {
  const { availableTripPhotos, photoUrls, actions } = useExperienceCtx();
  if (availableTripPhotos.length === 0) {
    return <TextPrompt prompt={prompt} chapterId={chapterId} />;
  }
  const question = prompt.selectionPrompt ?? prompt.creationPrompt ?? "";
  return (
    <div className="memory-slot memory-slot-invitation">
      <p className="section-title">{prompt.label}</p>
      <p className="memory-invitation-question">{question}</p>
      <div className="photo-pick-grid">
        {availableTripPhotos.map((photoId) => (
          <button
            key={photoId}
            type="button"
            className="photo-pick-option"
            data-chapter-id={chapterId}
            data-activity-id={prompt.id}
            data-photo-id={photoId}
            onClick={() => actions.selectEpiloguePhoto(chapterId, prompt.id, photoId)}
          >
            {photoUrls[photoId] ? <img src={photoUrls[photoId]} alt="" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

// Espejo de renderPromptSlot.
export function PromptSlot({
  prompt,
  chapterId,
  existingMemory,
  storyPackage,
}: {
  prompt: EpiloguePrompt;
  chapterId: string;
  existingMemory: Memory | null;
  storyPackage: StoryPackage;
}) {
  if (existingMemory) {
    return (
      <div className="prompt-answered">
        <p className="section-title">{prompt.label}</p>
        <SavedMemory memory={existingMemory} />
      </div>
    );
  }
  if (prompt.type === "retrospective" && prompt.retrospectiveSource === "place") {
    return <PlacePrompt prompt={prompt} chapterId={chapterId} storyPackage={storyPackage} />;
  }
  if (isPhotoPrompt(prompt)) {
    return <PhotoSelectionPrompt prompt={prompt} chapterId={chapterId} />;
  }
  return <TextPrompt prompt={prompt} chapterId={chapterId} />;
}
