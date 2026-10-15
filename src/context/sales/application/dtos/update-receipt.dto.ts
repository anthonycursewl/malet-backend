import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReceiptDto {
  /**
   * Corrección del "Facturar a". `null` lo deja vacío. Los importes y las
   * líneas son inmutables: solo se corrige el nombre del cliente (auditado).
   */
  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: 'customer_name must be 255 characters or fewer',
  })
  customer_name?: string | null;
}
