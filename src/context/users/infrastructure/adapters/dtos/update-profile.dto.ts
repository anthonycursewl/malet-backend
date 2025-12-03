import { IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(3, { message: 'El username debe tener al menos 3 caracteres' })
    @MaxLength(50, { message: 'El username no puede exceder 50 caracteres' })
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: 'El username solo puede contener letras, números, guiones y guiones bajos'
    })
    username?: string;
}
