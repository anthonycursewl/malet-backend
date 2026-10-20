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
  STORE_PHOTO_EDIT_MODES,
  STORE_RECEIPT_MODES,
  StoreCurrency,
  StorePhotoEditMode,
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

  /**
   * Quién puede cambiar la foto de perfil: `owner` (solo el dueño) o `members`
   * (cualquier miembro). Solo el dueño puede cambiarlo.
   */
  @IsOptional()
  @IsIn([...STORE_PHOTO_EDIT_MODES], {
    message: `avatar_edit_mode must be one of: ${STORE_PHOTO_EDIT_MODES.join(', ')}`,
  })
  avatar_edit_mode?: StorePhotoEditMode;

  /**
   * Quién puede cambiar el banner: `owner` o `members`.
   * Solo el dueño puede cambiarlo.
   */
  @IsOptional()
  @IsIn([...STORE_PHOTO_EDIT_MODES], {
    message: `banner_edit_mode must be one of: ${STORE_PHOTO_EDIT_MODES.join(', ')}`,
  })
  banner_edit_mode?: StorePhotoEditMode;
}
