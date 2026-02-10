import { Global, Module } from '@nestjs/common';
import { PolicyGuard } from './guards/policy.guard';
import { PolicyHandlerService } from './handlers/policy-handler.service';
import { AccountResourceResolver } from './resolvers/account.resolver';
import { UserResourceResolver } from './resolvers/user.resolver';
import { WalletModule } from 'src/context/wallet/wallet.module';
import { UserModule } from 'src/context/users/user.module';

/**
 * Módulo global de autorización.
 *
 * Proporciona:
 * - PolicyGuard: Guard para verificar políticas en endpoints
 * - PolicyHandlerService: Servicio para ejecutar verificaciones de políticas
 * - ResourceResolvers: Resolvers para obtener recursos por ID
 *
 * Este módulo es @Global() para que los guards y servicios
 * estén disponibles en toda la aplicación sin necesidad de
 * importar el módulo en cada feature module.
 *
 * Los resolvers dependen de los repositorios de cada contexto,
 * por lo que importamos WalletModule y UserModule para acceder
 * a ACCOUNT_REPOSITORY_PORT y USER_REPOSITORY_PORT.
 */
@Global()
@Module({
  imports: [WalletModule, UserModule],
  providers: [
    // Servicio central de políticas
    PolicyHandlerService,

    // Guard de autorización
    PolicyGuard,

    // Resolvers para cada tipo de recurso
    AccountResourceResolver,
    UserResourceResolver,
  ],
  exports: [
    PolicyGuard,
    PolicyHandlerService,
    AccountResourceResolver,
    UserResourceResolver,
  ],
})
export class AuthorizationModule {}
