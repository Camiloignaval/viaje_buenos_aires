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
      <p className="aurora-eyebrow aurora-reveal aurora-reveal-1">Revisa tu correo</p>
      <h1 className="aurora-entrance-title aurora-reveal aurora-reveal-2">
        Te enviamos seis números.
      </h1>
      <p className="aurora-entrance-text aurora-reveal aurora-reveal-3">
        Escríbelos acá para abrir Alaia.
      </p>
      <p className="aurora-entrance-email aurora-reveal aurora-reveal-4">{email}</p>
      <form
        className="aurora-entrance-form aurora-reveal aurora-reveal-4"
        noValidate
        onSubmit={handleSubmit((values) => onSubmit(values.code))}
      >
        <label htmlFor="login-code-input" className="aurora-sr-only">
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
          className="aurora-code-input"
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
        <p className="aurora-entrance-error" role="alert" aria-live="polite">
          {error ?? ""}
        </p>
      </form>
      <button
        type="button"
        className="aurora-entrance-secondary aurora-reveal aurora-reveal-5"
        onClick={onUseAnotherEmail}
      >
        Usar otro correo
      </button>
    </>
  );
}
