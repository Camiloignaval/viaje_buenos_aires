import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  codeFormSchema,
  normalizeCodeInput,
  type CodeFormValues,
} from "../validation/authSchemas";

interface Props {
  email: string;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (code: string) => void;
  onUseAnotherEmail: () => void;
}

// Paso 2 del umbral — copy exacta del viejo renderCodeStep().
export function CodeStep({
  email,
  submitting,
  submitError,
  onSubmit,
  onUseAnotherEmail,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeFormValues>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: "" },
  });

  const error = errors.code?.message ?? submitError;
  const codeField = register("code");

  return (
    <>
      <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">Revisa tu correo</p>
      <h1 className="alaia-entrance-title alaia-reveal alaia-reveal-2">
        Te enviamos seis números.
      </h1>
      <p className="alaia-entrance-text alaia-reveal alaia-reveal-3">
        Escríbelos acá para abrir Alaia.
      </p>
      <p className="alaia-entrance-email alaia-reveal alaia-reveal-4">{email}</p>
      <form
        className="alaia-entrance-form alaia-reveal alaia-reveal-4"
        noValidate
        onSubmit={handleSubmit((values) => onSubmit(values.code))}
      >
        <label htmlFor="login-code-input" className="alaia-sr-only">
          Código
        </label>
        <input
          id="login-code-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]*"
          placeholder="••••••"
          className="alaia-code-input"
          autoFocus
          {...codeField}
          onChange={(event) => {
            // Filtro en vivo a solo-dígitos (también cubre pegar el código completo).
            event.target.value = normalizeCodeInput(event.target.value);
            void codeField.onChange(event);
          }}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Abriendo…" : "Entrar a Alaia →"}
        </button>
        <p className="alaia-entrance-error" role="alert" aria-live="polite">
          {error ?? ""}
        </p>
      </form>
      <button
        type="button"
        className="alaia-entrance-secondary alaia-reveal alaia-reveal-5"
        onClick={onUseAnotherEmail}
      >
        Usar otro correo
      </button>
    </>
  );
}
