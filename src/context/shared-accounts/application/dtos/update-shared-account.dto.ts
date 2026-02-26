import { IsString, IsOptional } from 'class-validator';

export class UpdateSharedAccountDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    account_id?: string;

    @IsString()
    @IsOptional()
    identification_number?: string;

    @IsString()
    @IsOptional()
    phone_associated?: string;

    @IsString()
    @IsOptional()
    email_associated?: string;
}
