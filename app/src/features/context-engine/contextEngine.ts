import type { ContextModule } from "./types";
import { FinancialContextModule } from "./financialContextModule";

// Registro mínimo del Context Engine. Financial Context es el único módulo
// hoy; el registro existe para que módulos futuros (clima, huso horario,
// contexto cultural) se sumen por composición sin tocar los ya existentes —
// deliberadamente no es más que un Map con dos métodos.
const modules = new Map<string, ContextModule<unknown, unknown>>();

export function registerContextModule<TInput, TResult>(
  module: ContextModule<TInput, TResult>,
): void {
  modules.set(module.name, module as ContextModule<unknown, unknown>);
}

export function getContextModule<TInput, TResult>(
  name: string,
): ContextModule<TInput, TResult> | undefined {
  return modules.get(name) as ContextModule<TInput, TResult> | undefined;
}

registerContextModule(FinancialContextModule);
