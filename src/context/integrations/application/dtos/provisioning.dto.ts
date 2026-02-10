import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * DTO for provisioning a user in an external system
 */
export class ProvisioningRequestDto {
  @IsString()
  @MinLength(1)
  provider: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s-()]{7,20}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}
