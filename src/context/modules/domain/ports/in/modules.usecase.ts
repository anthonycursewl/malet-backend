import { ModuleKey } from '../../constants';

export const MODULES_USECASE = Symbol('MODULES_USECASE');

export interface ModuleStatus {
  key: string;
  name: string;
  description: string;
  opt_in: boolean;
  enabled: boolean;
  enabled_at: Date | null;
}

export interface ModulesUseCase {
  /** Every available optional module with its enabled state for the user. */
  list(user_id: string): Promise<ModuleStatus[]>;
  /** Enables/disables an opt-in module for the user. */
  setEnabled(
    user_id: string,
    key: ModuleKey,
    enabled: boolean,
  ): Promise<ModuleStatus>;
  /** Throws `ForbiddenException` when the module is not enabled for the user. */
  assertEnabled(user_id: string, key: ModuleKey): Promise<void>;
}
