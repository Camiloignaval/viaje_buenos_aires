import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailFormSchema, type EmailFormValues } from "../validation/authSchemas";

interface Props {
  defaultEmail: string;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (email: string) => void;
}

// Paso 1 del umbral — copy exacta del viejo renderEmailStep().
export function EmailStep({ defaultEmail, submitting, submitError, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: defaultEmail },
  });

  const error = errors.email?.message ?? submitError;

  return (
    <>
      <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">Alaia</p>
      <h1 className="alaia-entrance-title alaia-reveal alaia-reveal-2">
        Tus viajes empiezan aquí.
      </h1>
      <p className="alaia-entrance-text alaia-reveal alaia-reveal-3">
        Escribe tu correo y te enviaremos un código para entrar.
      </p>
      <form
        className="alaia-entrance-form alaia-reveal alaia-reveal-4"
        noValidate
        onSubmit={handleSubmit((values) => onSubmit(values.email))}
      >
        <label htmlFor="login-email-input" className="alaia-sr-only">
          Tu correo
        </label>
        <input
          id="login-email-input"
          type="email"
          autoComplete="email"
          placeholder="tu@ejemplo.com"
          autoFocus
          {...register("email")}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Enviando código…" : "Continuar →"}
        </button>
        <p className="alaia-entrance-error" role="alert" aria-live="polite">
          {error ?? ""}
        </p>
      </form>
      <p className="alaia-entrance-footer alaia-reveal alaia-reveal-5">
        Ya empezaste este viaje.
      </p>
    </>
  );
}
