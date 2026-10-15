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
import { DEFAULT_LIST_TAKE } from '../../../domain/constants';
import {
  CREDIT_ENTRIES_USECASE,
  CreditEntriesUseCase,
} from '../../../domain/ports/in/credit-entries.usecase';
import { CreateCreditEntryDto } from '../../../application/dtos/create-credit-entry.dto';
import { UpdateCreditEntryDto } from '../../../application/dtos/update-credit-entry.dto';
import { CreditListQueryDto } from '../dtos/credit-list-query.dto';
import { CreditCalendarQueryDto } from '../dtos/credit-calendar-query.dto';

@Controller('credit')
@UseGuards(JwtAuthGuard)
export class CreditController {
  constructor(
    @Inject(CREDIT_ENTRIES_USECASE)
    private readonly creditEntriesUseCase: CreditEntriesUseCase,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCreditEntryDto,
  ) {
    const entry = await this.creditEntriesUseCase.create(user.userId, dto);
    return entry.toPrimitives();
  }

  /** Month view for the calendar: entries by due_date plus pending/settled totals. */
  @Get('calendar')
  async calendar(
    @CurrentUser() user: { userId: string },
    @Query() query: CreditCalendarQueryDto,
  ) {
    const now = new Date();
    return this.creditEntriesUseCase.calendar({
      user_id: user.userId,
      year: query.year ?? now.getFullYear(),
      month: query.month ?? now.getMonth() + 1,
      type: query.type,
      status: query.status,
      account_id: query.account_id,
    });
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Query() query: CreditListQueryDto,
  ) {
    const take = query.take ?? DEFAULT_LIST_TAKE;

    const results = await this.creditEntriesUseCase.list({
      user_id: user.userId,
      take,
      cursor: query.cursor,
      type: query.type,
      status: query.status,
      account_id: query.account_id,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((entry) => entry.toPrimitives()),
      nextCursor,
    };
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const entry = await this.creditEntriesUseCase.getById(user.userId, id);
    return entry.toPrimitives();
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCreditEntryDto,
  ) {
    const entry = await this.creditEntriesUseCase.update(user.userId, id, dto);
    return entry.toPrimitives();
  }

  /** Marks as paid (payable) / collected (receivable). */
  @Post(':id/settle')
  async settle(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const entry = await this.creditEntriesUseCase.settle(user.userId, id);
    return entry.toPrimitives();
  }

  /** Back to pending: the wallet transaction created on settle is reverted. */
  @Post(':id/unsettle')
  async unsettle(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const entry = await this.creditEntriesUseCase.unsettle(user.userId, id);
    return entry.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const entry = await this.creditEntriesUseCase.softDelete(user.userId, id);
    return entry.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const entry = await this.creditEntriesUseCase.restore(user.userId, id);
    return entry.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.creditEntriesUseCase.hardDelete(user.userId, id);
    return { success: true };
  }
}
