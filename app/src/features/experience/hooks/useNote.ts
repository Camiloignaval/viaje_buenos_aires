import { useCallback, useEffect, useRef, useState } from "react";
import { useExperienceCtx } from "../components/experienceContext";
import { getNote, saveNote } from "../lib/notesStore";

export type NoteStatus = "idle" | "editing" | "saved";

const AUTOSAVE_DELAY_MS = 600;

// Nota privada de un objetivo (actividad, lugar, día, momento). Guardado
// automático y silencioso; escribe en localStorage, así funciona offline sin
// bloquear la interfaz. Nunca anuncia "guardado correctamente".
export function useNote(targetId: string) {
  const { scopeId } = useExperienceCtx();
  const [text, setTextState] = useState<string>(() => getNote(scopeId, targetId)?.text ?? "");
  const [status, setStatus] = useState<NoteStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setText = useCallback(
    (value: string) => {
      setTextState(value);
      setStatus("editing");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        saveNote(scopeId, targetId, value);
        setStatus("saved");
      }, AUTOSAVE_DELAY_MS);
    },
    [scopeId, targetId],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { text, setText, status };
}
