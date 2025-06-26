import { IsNumber, IsString, IsNotEmpty } from "class-validator";

export class TransactionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    account_id: string;
}