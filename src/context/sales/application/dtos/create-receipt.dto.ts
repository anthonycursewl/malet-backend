import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReceiptDto {
  /** Optional "Facturar a" name printed on the receipt. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, {
    message: 'customer_name must be 255 characters or fewer',
  })
  customer_name?: string;
}
