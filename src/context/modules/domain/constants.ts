/**
 * Opt-in modules a user can turn on inside the app. The list is intentionally
 * small: it is the single source of truth the client uses to know which
 * optional features exist and whether each one is enabled.
 */
export const MODULE_KEYS = ['gym'] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export interface AvailableModule {
  key: ModuleKey;
  name: string;
  description: string;
  /** `true` => hidden until the user enables it. */
  opt_in: boolean;
}

export const AVAILABLE_MODULES: readonly AvailableModule[] = [
  {
    key: 'gym',
    name: 'Gimnasio',
    description:
      'Rutina semanal (lunes a domingo) y registro de entrenamientos con métricas de progreso.',
    opt_in: true,
  },
];

export function findAvailableModule(key: string): AvailableModule | undefined {
  return AVAILABLE_MODULES.find((module) => module.key === key);
}
