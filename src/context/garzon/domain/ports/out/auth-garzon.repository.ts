import { AuthCredentials, AuthSession } from '../../entities/auth.entity';

export const AUTH_GARZON_REPOSITORY = 'AUTH_GARZON_REPOSITORY';

export abstract class AuthGarzonRepository {
  abstract login(credentials: AuthCredentials): Promise<AuthSession>;
  abstract getData(session: AuthSession): Promise<any>;
}
