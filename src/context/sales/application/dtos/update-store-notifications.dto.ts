import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateStoreNotificationsDto {
  /**
   * Grupos de avisos activos en la tienda (solo el dueño). Se aceptan como
   * objeto plano (`{ sales: true, receipts: false, ... }`) y el servicio deja
   * pasar solo los grupos conocidos con valor booleano.
   */
  @IsOptional()
  @IsObject()
  events?: Record<string, boolean>;

  /** Resumen diario de las ventas del día (solo el dueño). */
  @IsOptional()
  @IsBoolean()
  digest?: boolean;

  /** Miembros (`user_id`) que reciben los avisos. Reemplaza la selección actual. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  member_ids?: string[];
}
