import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
