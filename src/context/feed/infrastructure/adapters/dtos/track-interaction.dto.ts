import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';

/**
 * Tipos de interacción válidos
 */
export type InteractionTypeDto = 'view' | 'join' | 'leave' | 'like' | 'share' | 'dismiss' | 'click';

/**
 * DTO para trackear una interacción
 */
export class TrackInteractionDto {
    @IsString()
    @IsNotEmpty({ message: 'communityId es requerido' })
    communityId: string;

    @IsString()
    @IsNotEmpty({ message: 'interaction es requerido' })
    @IsEnum(['view', 'join', 'leave', 'like', 'share', 'dismiss', 'click'], {
        message: 'interaction debe ser uno de: view, join, leave, like, share, dismiss, click'
    })
    interaction: InteractionTypeDto;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}

/**
 * DTO para trackear múltiples views
 */
export class TrackViewsDto {
    @IsString({ each: true })
    @IsNotEmpty({ message: 'communityIds es requerido' })
    communityIds: string[];
}
