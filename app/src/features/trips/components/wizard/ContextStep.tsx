import { useLayoutEffect, useRef } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";

const TRAVEL_CONTEXT_MAX_LENGTH = 500;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ContextStep({ value, onChange, onBack, onNext }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // El textarea crece con el contenido: el borde inferior tiene que quedar
  // pegado al texto, no fijo a 4 filas dejando un vacío entre el cursor y
  // la línea (ver bug reportado: línea "flotando" muy por debajo del texto).
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <WizardShell
      question="¿Hay algo que te gustaría que Alaia tuviera presente durante este viaje?"
      onBack={onBack}
      onNext={onNext}
    >
      <label htmlFor="wizard-context-input">Contexto (opcional)</label>
      <textarea
        ref={textareaRef}
        id="wizard-context-input"
        autoFocus
        rows={1}
        maxLength={TRAVEL_CONTEXT_MAX_LENGTH}
        placeholder="Nos gusta caminar. Preferimos empezar tarde. Uno de nosotros es vegetariano…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="combobox-helper context-char-count">
        {value.length}/{TRAVEL_CONTEXT_MAX_LENGTH}
      </p>
    </WizardShell>
  );
}
