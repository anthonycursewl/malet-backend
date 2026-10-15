import { CreditStatus, CreditType } from './constants';
import { CreditEntryPrimitives } from './entities/credit-entry.entity';

export interface CreditCalendarParams {
  user_id: string;
  year: number;
  month: number;
  type?: CreditType;
  status?: CreditStatus;
  account_id?: string;
}

export interface CreditTypeSummary {
  pending_count: number;
  pending_amount: number;
  settled_count: number;
  settled_amount: number;
}

export interface CreditCalendarResult {
  year: number;
  month: number;
  summary: Record<CreditType, CreditTypeSummary>;
  data: CreditEntryPrimitives[];
}
