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
      <p className="aurora-eyebrow aurora-reveal aurora-reveal-1">Aurora</p>
      <h1 className="aurora-entrance-title aurora-reveal aurora-reveal-2">
        Tus viajes empiezan acá.
      </h1>
      <p className="aurora-entrance-text aurora-reveal aurora-reveal-3">
        Escribí tu correo y te enviamos un código para entrar.
      </p>
      <form
        className="aurora-entrance-form aurora-reveal aurora-reveal-4"
        noValidate
        onSubmit={handleSubmit((values) => onSubmit(values.email))}
      >
        <label htmlFor="login-email-input" className="aurora-sr-only">
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
        <p className="aurora-entrance-error" role="alert" aria-live="polite">
          {error ?? ""}
        </p>
      </form>
      <p className="aurora-entrance-footer aurora-reveal aurora-reveal-5">
        Ya empezaste este viaje.
      </p>
    </>
  );
}
