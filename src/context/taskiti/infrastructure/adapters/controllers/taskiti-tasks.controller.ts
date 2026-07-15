import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SourceGuard } from '../../../../../auth/guards/source.guard';
import { Source } from '../../../../../auth/decorators/source.decorator';
import { TaskitiTasksService } from '../../../application/taskiti-tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard('taskiti-jwt'), SourceGuard)
@Source('taskiti')
export class TaskitiTasksController {
  constructor(private readonly tasksService: TaskitiTasksService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Req() req: any,
    @Query('include_deleted') include_deleted?: string,
    @Query('since') since?: string,
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.tasksService.findAll(req.user.userId, {
      include_deleted,
      since,
      status,
      take: take ? Math.min(Number(take), 100) : 20,
      cursor,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.findOne(req.user.userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    return this.tasksService.create(req.user.userId, body);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.tasksService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.remove(req.user.userId, id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync(@Req() req: any, @Body() body: any) {
    return this.tasksService.sync(req.user.userId, body);
  }
}
