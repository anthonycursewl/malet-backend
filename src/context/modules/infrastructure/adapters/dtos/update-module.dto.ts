import { IsBoolean } from 'class-validator';

export class UpdateModuleDto {
  /** `true` activates the module for the user, `false` hides it again. */
  @IsBoolean()
  enabled: boolean;
}
