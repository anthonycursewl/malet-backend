import {
  Body,
  Controller,
  Inject,
  Post,
  Get,
  UseGuards,
  Param,
  Put,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { TransactionTagService } from '../../../application/transaction-tag.service';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsHexColor,
} from 'class-validator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(4)
  available_colors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(4)
  palette?: string[]; // compat con frontend que envía 'palette'
}

class UpdateTagDto {
  name?: string;
  color?: string;
}

class AssignTagsDto {
  tagIds: string[];
}

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TransactionTagController {
  constructor(private readonly tagService: TransactionTagService) {}

  @Post()
  async create(
    @CurrentUser() user: { userId: string; email: string },
    @Body() dto: CreateTagDto,
  ) {
    // Validaciones y normalización en el controller
    // Normalizar color único (si existe)
    let normalizedColor: string | undefined = dto.color?.trim().toLowerCase();
    const hexColorPattern = /^#[0-9a-f]{3}([0-9a-f]{3})?$/;
    if (normalizedColor && !hexColorPattern.test(normalizedColor)) {
      throw new BadRequestException(
        'Color must be a hex color starting with # and lowercase',
      );
    }

    // Validar palette (paleta) si se envía (compatibilidad con 'palette' desde frontend)
    let normalizedAvailableColors: string[] | undefined;
    let paletteSource: string[] | undefined;
    if (dto.palette && Array.isArray(dto.palette)) {
      paletteSource = dto.palette;
    } else if (dto.available_colors && Array.isArray(dto.available_colors)) {
      paletteSource = dto.available_colors;
    }
    if (paletteSource) {
      if (!Array.isArray(paletteSource)) {
        // Si paletteSource no es un arreglo, error (aunque deberia ser array si llega aqui)
        throw new BadRequestException(
          'available_colors must be an array of strings',
        );
      }
      if (paletteSource.length > 4) {
        throw new BadRequestException(
          'available_colors must have at most 4 colors',
        );
      }
      normalizedAvailableColors = (paletteSource as string[]).map((c) => {
        const v = String(c).trim().toLowerCase();
        if (!hexColorPattern.test(v)) {
          throw new BadRequestException(
            'Each color in available_colors must be a valid hex color starting with # and lowercase',
          );
        }
        return v;
      });
    }

    // soporte de compatibilidad con frontend que envía 'palette'
    const tag = await this.tagService.createTag({
      name: dto.name,
      color: normalizedColor,
      userId: user.userId,
      available_colors: normalizedAvailableColors,
    });
    return tag.toPrimitives();
  }

  @Get()
  async getAll(@CurrentUser() user: { userId: string; email: string }) {
    const tags = await this.tagService.getUserTags(user.userId);
    return tags.map((tag) => tag.toPrimitives());
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: { userId: string; email: string },
    @Param('id') id: string,
  ) {
    const tag = await this.tagService.getTagById(id, user.userId);
    if (!tag) {
      return { error: 'Tag not found' };
    }
    return tag.toPrimitives();
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string; email: string },
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    const tag = await this.tagService.updateTag({
      id,
      name: dto.name,
      color: dto.color,
      userId: user.userId,
    });
    return tag.toPrimitives();
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: { userId: string; email: string },
    @Param('id') id: string,
  ) {
    await this.tagService.deleteTag(id, user.userId);
    return { success: true };
  }

  @Post(':id/transactions/:transactionId')
  async assignToTransaction(
    @CurrentUser() user: { userId: string; email: string },
    @Param('transactionId') transactionId: string,
    @Param('id') tagId: string,
  ) {
    await this.tagService.assignTagsToTransaction({
      transactionId,
      tagIds: [tagId],
      userId: user.userId,
    });
    return { success: true };
  }

  @Post('transactions/:transactionId')
  async assignMultipleToTransaction(
    @CurrentUser() user: { userId: string; email: string },
    @Param('transactionId') transactionId: string,
    @Body() dto: AssignTagsDto,
  ) {
    await this.tagService.assignTagsToTransaction({
      transactionId,
      tagIds: dto.tagIds,
      userId: user.userId,
    });
    return { success: true };
  }

  @Delete(':tagId/transactions/:transactionId')
  async removeFromTransaction(
    @CurrentUser() user: { userId: string; email: string },
    @Param('transactionId') transactionId: string,
    @Param('tagId') tagId: string,
  ) {
    await this.tagService.removeTagFromTransaction(
      transactionId,
      tagId,
      user.userId,
    );
    return { success: true };
  }

  @Get('transactions/:transactionId')
  async getTransactionTags(
    @CurrentUser() user: { userId: string; email: string },
    @Param('transactionId') transactionId: string,
  ) {
    const tags = await this.tagService.getTransactionTags(
      transactionId,
      user.userId,
    );
    return tags.map((tag) => tag.toPrimitives());
  }
}
