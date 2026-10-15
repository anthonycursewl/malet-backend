import { IsNotEmpty, IsString } from 'class-validator';

export class LinkCustomerDto {
  /** Customer to share with this store. */
  @IsString()
  @IsNotEmpty({ message: 'customer_id is required' })
  customer_id: string;
}
