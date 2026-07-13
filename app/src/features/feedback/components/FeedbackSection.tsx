import { useState } from "react";
import type { FormEvent } from "react";
import { SelectField } from "@/components/inputs/SelectField";
import { useSubmitFeedback } from "../hooks/useSubmitFeedback";
import type { FeedbackCategory } from "../api/feedbackApi";

const CATEGORIES: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "suggestion", label: "Sugerencia" },
  { value: "problem", label: "Problema" },
  { value: "question", label: "Consulta" },
  { value: "other", label: "Otro" },
];

function deviceType() {
  if (typeof navigator === "undefined") return undefined;
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

function osName() {
  if (typeof navigator === "undefined") return undefined;
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return undefined;
}

function feedbackContext() {
  return {
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
    pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
    locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    appVersion: import.meta.env.VITE_APP_VERSION,
    browser: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    os: osName(),
    deviceType: deviceType(),
  };
}

export function FeedbackSection() {
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const mutation = useSubmitFeedback();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutation.mutateAsync({ category, message, ...feedbackContext() });
      setMessage("");
    } catch {
      // El estado de error lo expone React Query; no relanzamos para evitar
      // rechazos no manejados desde el submit del formulario.
    }
  }

  return (
    <section className="feedback-section alaia-reveal alaia-reveal-5" aria-labelledby="feedback-title">
      <div>
        <p className="feedback-kicker">Alaia mejora con vos</p>
        <h2 id="feedback-title" className="feedback-title">
          Queremos seguir mejorando contigo
        </h2>
        <p className="feedback-description">
          ¿Hay algo que podríamos hacer mejor?
          <br />
          Tu mirada también forma parte de esta historia.
        </p>
      </div>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <SelectField
          id="feedback-category"
          className="feedback-select-field"
          label="Categoría"
          labelClassName="feedback-label"
          value={category}
          options={CATEGORIES}
          onChange={setCategory}
        />

        <label className="feedback-label" htmlFor="feedback-message">
          Mensaje
        </label>
        <textarea
          id="feedback-message"
          className="feedback-textarea"
          value={message}
          maxLength={3000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Cuéntanos qué viste, qué sentiste o qué podríamos cuidar mejor."
          required
        />

        {mutation.isError && (
          <p className="trips-error">
            {mutation.error instanceof Error ? mutation.error.message : "No pudimos enviar tu sugerencia."}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="feedback-success">
            Gracias por ayudarnos a mejorar Alaia.
            <br />
            Leeremos tu mensaje con atención.
          </p>
        )}

        <button type="submit" className="trips-create-link" disabled={mutation.isPending || message.trim().length < 10}>
          {mutation.isPending ? "Enviando..." : "Enviar sugerencia →"}
        </button>
      </form>
    </section>
  );
}
