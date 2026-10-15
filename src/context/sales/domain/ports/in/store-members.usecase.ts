import { StoreMember } from '../../entities/store-member.entity';
import { AddMemberDto } from '../../../application/dtos/add-member.dto';
import {
  ListMemberSummariesOptions,
  MemberSummary,
} from '../out/store.repository';

export const STORE_MEMBERS_USECASE = Symbol('STORE_MEMBERS_USECASE');

export interface StoreMembersUseCase {
  /** Keyset paginated members with only the info the list renders. */
  list(
    store_id: string,
    options: ListMemberSummariesOptions,
  ): Promise<MemberSummary[]>;
  add(
    store_id: string,
    user_id: string,
    dto: AddMemberDto,
  ): Promise<StoreMember>;
  softDelete(store_id: string, member_id: string): Promise<StoreMember>;
  restore(store_id: string, member_id: string): Promise<StoreMember>;
  /** Permanent removal: only the user that added the member can do it. */
  hardDelete(
    store_id: string,
    member_id: string,
    user_id: string,
  ): Promise<void>;
}
