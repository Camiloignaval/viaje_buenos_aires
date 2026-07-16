import { useState } from "react";
import { SelectField } from "@/components/inputs/SelectField";
import { useExperienceCtx } from "./experienceContext";
import { MemoryInvitation, SavedMemory } from "./Memories";
import { photoSlotKey } from "../lib/photoSlot";
import type { EpiloguePrompt, StoryPackage } from "@/features/story/engine/types";
import type { Memory } from "@/features/album/data/types";

function isPhotoPrompt(prompt: EpiloguePrompt): boolean {
  return prompt.memoryType === "photo" || prompt.sourceCategory === "photo";
}

function PromptMemoryInvitation({ prompt, chapterId }: { prompt: EpiloguePrompt; chapterId: string }) {
  const { stagedPhotosBySlot } = useExperienceCtx();
  const question = prompt.creationPrompt ?? prompt.selectionPrompt ?? "";
  const staged = stagedPhotosBySlot.get(photoSlotKey(chapterId, prompt.id)) ?? [];
  return (
    <div className="prompt-memory-invitation">
      <p className="section-title">{prompt.label}</p>
      <MemoryInvitation
        chapterId={chapterId}
        activityId={prompt.id}
        question={question}
        hint={isPhotoPrompt(prompt) ? "Pueden elegir una foto o acompañar el momento con sus palabras." : ""}
        staged={staged}
      />
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
    return <PromptMemoryInvitation prompt={prompt} chapterId={chapterId} />;
  }
  return (
    <div className="memory-slot memory-slot-invitation">
      <p className="section-title">{prompt.label}</p>
      <p className="memory-invitation-question">{prompt.selectionPrompt ?? ""}</p>
      <SelectField
        className="memory-place-select"
        label={prompt.selectionPrompt ?? prompt.label}
        labelClassName="alaia-sr-only"
        value={selected}
        options={places.map((place) => ({ value: place.name, label: place.name }))}
        onChange={setSelected}
      />
      <button
        type="button"
        data-chapter-id={chapterId}
        data-activity-id={prompt.id}
        onClick={() => actions.selectPlace(chapterId, prompt.id, selected)}
      >
        Guardar esta elección
      </button>
    </div>
  );
}

// Espejo de renderPhotoSelectionPrompt: elige entre las fotos reales del viaje.
function PhotoSelectionPrompt({ prompt, chapterId }: { prompt: EpiloguePrompt; chapterId: string }) {
  const { availableTripPhotos, photoUrls, actions } = useExperienceCtx();
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  if (availableTripPhotos.length === 0) {
    return <PromptMemoryInvitation prompt={prompt} chapterId={chapterId} />;
  }
  const question = prompt.selectionPrompt ?? prompt.creationPrompt ?? "";
  return (
    <div className="memory-slot memory-slot-invitation">
      <p className="section-title">{prompt.label}</p>
      <p className="memory-invitation-question">{question}</p>
      <div className="photo-pick-grid">
        {availableTripPhotos.map((photoId, index) => (
          <button
            key={photoId}
            type="button"
            className={`photo-pick-option${selectedPhotoId === photoId ? " is-selected" : ""}`}
            aria-label={`Elegir foto ${index + 1} para ${prompt.label}`}
            aria-pressed={selectedPhotoId === photoId}
            data-chapter-id={chapterId}
            data-activity-id={prompt.id}
            data-photo-id={photoId}
            onClick={() => setSelectedPhotoId(photoId)}
          >
            {photoUrls[photoId] ? <img src={photoUrls[photoId]} alt={`Foto ${index + 1} del viaje`} /> : null}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!selectedPhotoId}
        onClick={() => {
          if (selectedPhotoId) actions.selectEpiloguePhoto(chapterId, prompt.id, selectedPhotoId);
        }}
      >
        Guardar esta elección
      </button>
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
  return <PromptMemoryInvitation prompt={prompt} chapterId={chapterId} />;
}
