import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  TransactionTagRepository,
  TRANSACTION_TAG_REPOSITORY_PORT,
} from '../domain/ports/out/transaction-tag.repository';
import { logTagError } from '../utils/log-tag-errors';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TransactionTag } from '../domain/entities/transaction-tag.entity';
import {
  CreateTagParams,
  UpdateTagParams,
  AssignTagsParams,
} from '../domain/ports/in/transaction-tag.usecase';

export const TRANSACTION_TAG_SERVICE_PORT = 'TRANSACTION_TAG_SERVICE_PORT';

@Injectable()
export class TransactionTagService {
  constructor(
    @Inject(TRANSACTION_TAG_REPOSITORY_PORT)
    private readonly tagRepository: TransactionTagRepository,
  ) {}

  async createTag(params: CreateTagParams): Promise<TransactionTag> {
    try {
      const existingTag = await this.tagRepository.findBySlug(
        params.userId,
        params.name.toLowerCase(),
      );
      if (existingTag) {
        throw new BadRequestException('Tag with this name already exists');
      }

      const paletteToUse = params.palette ?? params.available_colors;
      const tag = TransactionTag.create({
        name: params.name,
        color: params.color,
        userId: params.userId,
        available_colors: paletteToUse,
      });

      return this.tagRepository.save(tag);
    } catch (err) {
      logTagError('TransactionTagService.createTag', err);
      // Normalizar errores de Prisma para el frontend
      const code = (err as any).code;
      if (code === 'P2002') {
        const details = (err as any).meta?.constraint || (err as any).meta;
        throw new HttpException(
          {
            code: 'TAG_ALREADY_EXISTS',
            message: 'Tag with this name already exists',
            statusCode: HttpStatus.CONFLICT,
            details,
          },
          HttpStatus.CONFLICT,
        );
      }
      throw new HttpException(
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateTag(params: UpdateTagParams): Promise<TransactionTag> {
    const tag = await this.tagRepository.findById(params.id);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.getUserId() !== params.userId) {
      throw new BadRequestException('You can only update your own tags');
    }

    if (params.name) {
      const existingTag = await this.tagRepository.findBySlug(
        params.userId,
        params.name.toLowerCase(),
      );
      if (existingTag && existingTag.getId() !== params.id) {
        throw new BadRequestException('Tag with this name already exists');
      }
    }

    const updatedTag = tag.update({
      name: params.name,
      color: params.color,
    });

    return this.tagRepository.save(updatedTag);
  }

  async deleteTag(id: string, userId: string): Promise<void> {
    const tag = await this.tagRepository.findById(id);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.getUserId() !== userId) {
      throw new BadRequestException('You can only delete your own tags');
    }

    await this.tagRepository.delete(id);
  }

  async getUserTags(userId: string): Promise<TransactionTag[]> {
    return this.tagRepository.findByUserId(userId);
  }

  async getTagById(id: string, userId: string): Promise<TransactionTag | null> {
    const tag = await this.tagRepository.findById(id);
    if (!tag || tag.getUserId() !== userId) {
      return null;
    }
    return tag;
  }

  async assignTagsToTransaction(params: AssignTagsParams): Promise<void> {
    // Si no hay tags, no hacer nada
    if (!params.tagIds || params.tagIds.length === 0) return;

    // 1) Cargar etiquetas actuales de la transacción para calcular el total permitido
    const currentTags = await this.tagRepository.findByTransactionId(
      params.transactionId,
    );
    const currentSet = new Set<string>(currentTags.map((t) => t.getId()));

    // 2) Calcular cuántas etiquetas únicas se van a añadir
    const incomingUnique = Array.from(new Set(params.tagIds));
    const newUniqueIds = incomingUnique.filter((id) => !currentSet.has(id));

    // 3) Validar límite (máximo 10 etiquetas por transacción)
    if (currentSet.size + newUniqueIds.length > 10) {
      throw new HttpException(
        {
          code: 'TAG_LIMIT_EXCEEDED',
          message: 'Transaction cannot have more than 10 tags',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4) Validar existencia y ownership de cada tag que se va a asignar
    for (const tagId of incomingUnique) {
      const tag = await this.tagRepository.findById(tagId);
      if (!tag) {
        throw new NotFoundException(`Tag ${tagId} not found`);
      }
      if (tag.getUserId() !== params.userId) {
        throw new BadRequestException('You can only assign your own tags');
      }
    }

    // 5) Realizar la asignación
    await this.tagRepository.assignToTransaction(
      params.transactionId,
      incomingUnique,
    );
  }

  async removeTagFromTransaction(
    transactionId: string,
    tagId: string,
    userId: string,
  ): Promise<void> {
    const tag = await this.tagRepository.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.getUserId() !== userId) {
      throw new BadRequestException('You can only remove your own tags');
    }

    await this.tagRepository.removeFromTransaction(transactionId, tagId);
  }

  async getTransactionTags(
    transactionId: string,
    userId: string,
  ): Promise<TransactionTag[]> {
    return this.tagRepository.findByTransactionId(transactionId);
  }
}
