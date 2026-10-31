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
import { DEFAULT_NOTES_TAKE } from '../../../domain/constants';
import {
  NOTES_USECASE,
  NotesUseCase,
} from '../../../domain/ports/in/notes.usecase';
import { CreateNoteDto } from '../../../application/dtos/create-note.dto';
import { UpdateNoteDto } from '../../../application/dtos/update-note.dto';
import { NotesQueryDto } from '../dtos/notes-query.dto';
import { LinkTargetsQueryDto } from '../dtos/link-targets-query.dto';

/** Notas personales en Markdown. Aislamiento por `user_id` del JWT. */
@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(
    @Inject(NOTES_USECASE)
    private readonly notesUseCase: NotesUseCase,
  ) {}

  /** Lista liviana: extracto en vez del contenido completo. */
  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Query() query: NotesQueryDto,
  ) {
    const take = query.take ?? DEFAULT_NOTES_TAKE;
    const results = await this.notesUseCase.list({
      user_id: user.userId,
      take,
      cursor: query.cursor,
      search: query.search,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((note) => note.toSummary()),
      nextCursor,
    };
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateNoteDto,
  ) {
    const note = await this.notesUseCase.create(user.userId, dto);
    return note.toPrimitives();
  }

  /** Mapa completo de conocimiento (nodos y aristas). */
  @Get('graph')
  async graph(@CurrentUser() user: { userId: string }) {
    return this.notesUseCase.graph(user.userId);
  }

  /** Picker liviano para enlazar notas con `[[`. */
  @Get('link-targets')
  async linkTargets(
    @CurrentUser() user: { userId: string },
    @Query() query: LinkTargetsQueryDto,
  ) {
    const targets = await this.notesUseCase.linkTargets(
      user.userId,
      query.search,
      query.take ?? DEFAULT_NOTES_TAKE,
      query.exclude_id,
    );
    return { data: targets };
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const { note, links, backlinks } = await this.notesUseCase.getDetail(
      user.userId,
      id,
    );

    return {
      ...note.toPrimitives(),
      links,
      backlinks: backlinks.map((backlink) => backlink.toSummary()),
    };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    const note = await this.notesUseCase.update(user.userId, id, dto);
    return note.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const note = await this.notesUseCase.softDelete(user.userId, id);
    return note.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const note = await this.notesUseCase.restore(user.userId, id);
    return note.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.notesUseCase.hardDelete(user.userId, id);
    return { success: true };
  }
}
