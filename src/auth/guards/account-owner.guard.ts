import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY_PORT,
  AccountRepository,
} from 'src/context/wallet/domain/ports/out/account.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class AccountOwnerGuard implements CanActivate {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_PORT)
    private readonly accountRepository: AccountRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const accountId = request.params.account_id || request.body.account_id;

    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (!accountId) {
      return true;
    }

    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    if (account.toPrimitives().user_id !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a esta cuenta',
      );
    }

    return true;
  }
}
