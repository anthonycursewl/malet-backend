import { IsNumber, IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class TransactionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['saving', 'expense', 'pending_payment'], { message: 'Type must be saving, expense or pending_payment' })

  type: string;

  @IsString()
  @IsNotEmpty()
  account_id: string;
}
