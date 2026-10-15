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
  STORES_USECASE,
  StoresUseCase,
} from '../../../domain/ports/in/stores.usecase';
import { CreateStoreDto } from '../../../application/dtos/create-store.dto';
import { UpdateStoreDto } from '../../../application/dtos/update-store.dto';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateStoreDto,
  ) {
    const store = await this.storesUseCase.create(user.userId, dto);
    return store.toPrimitives();
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Query('take') takeQuery?: string,
    @Query('cursor') cursor?: string,
  ) {
    const take = takeQuery ? Number(takeQuery) : DEFAULT_LIST_TAKE;

    const results = await this.storesUseCase.list({
      user_id: user.userId,
      take,
      cursor,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((store) => store.toPrimitives()),
      nextCursor,
    };
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const { store, member_count } = await this.storesUseCase.detail(
      id,
      user.userId,
    );
    return { ...store.toPrimitives(), member_count };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    await this.storesUseCase.getMemberStore(id, user.userId);
    const updated = await this.storesUseCase.update(id, user.userId, dto);
    return updated.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.storesUseCase.getMemberStore(id, user.userId);
    const deleted = await this.storesUseCase.softDelete(id);
    return deleted.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const restored = await this.storesUseCase.restore(id, user.userId);
    return restored.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.storesUseCase.hardDelete(id, user.userId);
    return { success: true };
  }
}
