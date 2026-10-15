import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  STORE_CURRENCIES,
  STORE_RECEIPT_MODES,
  StoreCurrency,
  StoreReceiptMode,
} from '../../domain/constants';

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'name must be 255 characters or fewer' })
  name?: string;

  /** Only allowed while the store has no sales: history would change meaning otherwise. */
  @IsOptional()
  @IsIn([...STORE_CURRENCIES], {
    message: `currency must be one of: ${STORE_CURRENCIES.join(', ')}`,
  })
  currency?: StoreCurrency;

  /** Contact info printed on the receipts. `null` clears the value. */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'phone must be 50 characters or fewer' })
  phone?: string | null;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email' })
  @MaxLength(255, { message: 'email must be 255 characters or fewer' })
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'address must be 255 characters or fewer' })
  address?: string | null;

  /**
   * Política de recibos: `ask` (preguntar), `always` o `never`.
   * Solo el dueño de la tienda puede cambiarla.
   */
  @IsOptional()
  @IsIn([...STORE_RECEIPT_MODES], {
    message: `receipt_mode must be one of: ${STORE_RECEIPT_MODES.join(', ')}`,
  })
  receipt_mode?: StoreReceiptMode;
}
