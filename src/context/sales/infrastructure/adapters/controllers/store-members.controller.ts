import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  STORES_USECASE,
  StoresUseCase,
} from '../../../domain/ports/in/stores.usecase';
import {
  STORE_MEMBERS_USECASE,
  StoreMembersUseCase,
} from '../../../domain/ports/in/store-members.usecase';
import { AddMemberDto } from '../../../application/dtos/add-member.dto';
import { MembersQueryDto } from '../dtos/members-query.dto';

const DEFAULT_MEMBERS_TAKE = 20;

@Controller('stores/:store_id/members')
@UseGuards(JwtAuthGuard)
export class StoreMembersController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
    @Inject(STORE_MEMBERS_USECASE)
    private readonly storeMembersUseCase: StoreMembersUseCase,
  ) {}

  private async assertMember(
    store_id: string,
    user: { userId: string },
  ): Promise<void> {
    await this.storesUseCase.getMemberStore(store_id, user.userId);
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Query() query: MembersQueryDto,
  ) {
    await this.assertMember(store_id, user);
    const take = query.take ?? DEFAULT_MEMBERS_TAKE;

    const members = await this.storeMembersUseCase.list(store_id, {
      store_id,
      take,
      cursor: query.cursor,
    });

    // Keyset pagination: the cursor is the auto-increment `seq` of the last row.
    const nextCursor =
      members.length === take ? String(members[members.length - 1].seq) : null;

    return { data: members, nextCursor };
  }

  @Post()
  async add(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Body() dto: AddMemberDto,
  ) {
    await this.assertMember(store_id, user);
    const member = await this.storeMembersUseCase.add(
      store_id,
      user.userId,
      dto,
    );
    return member.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const member = await this.storeMembersUseCase.softDelete(store_id, id);
    return member.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const member = await this.storeMembersUseCase.restore(store_id, id);
    return member.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    await this.storeMembersUseCase.hardDelete(store_id, id, user.userId);
    return { success: true };
  }
}
