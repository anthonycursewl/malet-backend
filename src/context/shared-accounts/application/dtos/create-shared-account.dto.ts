import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSharedAccountDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    account_id: string;

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
