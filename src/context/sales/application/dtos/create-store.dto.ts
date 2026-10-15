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

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'name must be 255 characters or fewer' })
  name: string;

  /** Every amount of this store (cost, PVP, sales, reports) is expressed in this currency. */
  @IsIn([...STORE_CURRENCIES], {
    message: `currency must be one of: ${STORE_CURRENCIES.join(', ')}`,
  })
  currency: StoreCurrency;

  /** Contact info printed on the receipts (optional). */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'phone must be 50 characters or fewer' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email' })
  @MaxLength(255, { message: 'email must be 255 characters or fewer' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'address must be 255 characters or fewer' })
  address?: string;

  /** Política de recibos (por defecto `ask`). Solo el dueño puede cambiarla. */
  @IsOptional()
  @IsIn([...STORE_RECEIPT_MODES], {
    message: `receipt_mode must be one of: ${STORE_RECEIPT_MODES.join(', ')}`,
  })
  receipt_mode?: StoreReceiptMode;
}
