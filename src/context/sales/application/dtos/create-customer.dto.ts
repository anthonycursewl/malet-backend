import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(255, { message: 'name must be 255 characters or fewer' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'phone must be 50 characters or fewer' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'email must be 255 characters or fewer' })
  email?: string;
}
