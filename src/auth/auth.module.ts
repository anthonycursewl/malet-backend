import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '../shared/infrastructure/services/auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SourceGuard } from './guards/source.guard';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '5d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [AuthService, JwtStrategy, ConfigService, SourceGuard, ApiKeyGuard],
  exports: [AuthService, JwtModule, PassportModule, JwtStrategy, SourceGuard, ApiKeyGuard],
})
export class AuthModule {}
