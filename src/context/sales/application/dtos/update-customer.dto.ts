import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'name cannot be empty' })
  @MaxLength(255, { message: 'name must be 255 characters or fewer' })
  name?: string;

  /** `null` clears the phone. */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'phone must be 50 characters or fewer' })
  phone?: string | null;

  /** `null` clears the email. */
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'email must be 255 characters or fewer' })
  email?: string | null;
}
