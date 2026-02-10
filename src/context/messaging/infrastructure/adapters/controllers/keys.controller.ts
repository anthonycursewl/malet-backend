import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

// Use Cases
import {
  MANAGE_KEYS_USECASE,
  ManageKeysUseCase,
} from '../../../domain/ports/in/manage-keys.usecase';

// DTOs
import { RegisterKeyDto } from '../dtos/register-key.dto';

@Controller('keys')
@UseGuards(JwtAuthGuard)
export class KeysController {
  constructor(
    @Inject(MANAGE_KEYS_USECASE)
    private readonly manageKeysUseCase: ManageKeysUseCase,
  ) {}

  /**
   * Obtener mis claves públicas
   * GET /keys/me
   */
  @Get('me')
  async getMyKeys(@CurrentUser() user: { userId: string }) {
    const keys = await this.manageKeysUseCase.getMyKeys(user.userId);

    return {
      keys: keys.map((k) => ({
        id: k.getId(),
        deviceId: k.getDeviceId(),
        keyFingerprint: k.getKeyFingerprint(),
        isActive: k.getIsActive(),
        createdAt: k.getCreatedAt(),
      })),
    };
  }

  /**
   * Obtener claves públicas de un usuario
   * GET /keys/users/:userId
   */
  @Get('users/:userId')
  async getUserKeys(@Param('userId') targetUserId: string) {
    const keys = await this.manageKeysUseCase.getUserKeys(targetUserId);

    return {
      keys: keys.map((k) => ({
        id: k.getId(),
        deviceId: k.getDeviceId(),
        publicKey: k.getPublicKey(),
        keyFingerprint: k.getKeyFingerprint(),
        createdAt: k.getCreatedAt(),
      })),
    };
  }

  /**
   * Registrar una clave pública
   * POST /keys
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async registerKey(
    @CurrentUser() user: { userId: string },
    @Body() dto: RegisterKeyDto,
  ) {
    const key = await this.manageKeysUseCase.registerKey(user.userId, {
      deviceId: dto.deviceId,
      publicKey: dto.publicKey,
      keyFingerprint: dto.keyFingerprint,
    });

    return {
      message: 'Clave registrada exitosamente',
      key: {
        id: key.getId(),
        deviceId: key.getDeviceId(),
        keyFingerprint: key.getKeyFingerprint(),
        createdAt: key.getCreatedAt(),
      },
    };
  }

  /**
   * Revocar una clave
   * DELETE /keys/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async revokeKey(
    @CurrentUser() user: { userId: string },
    @Param('id') keyId: string,
  ) {
    await this.manageKeysUseCase.revokeKey(user.userId, keyId);

    return {
      message: 'Clave revocada exitosamente',
    };
  }

  /**
   * Revocar todas las claves (logout global)
   * DELETE /keys
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async revokeAllKeys(@CurrentUser() user: { userId: string }) {
    await this.manageKeysUseCase.revokeAllKeys(user.userId);

    return {
      message: 'Todas las claves revocadas',
    };
  }
}
