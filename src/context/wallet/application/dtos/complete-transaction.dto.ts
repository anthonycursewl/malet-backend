import { IsNotEmpty, IsEnum } from 'class-validator';

export class CompleteTransactionDto {
    @IsNotEmpty()
    @IsEnum(['saving', 'expense'], { message: 'Type must be saving or expense' })

    type: string;
}
