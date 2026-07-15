import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class TaskitiJwtStrategy extends PassportStrategy(Strategy, 'taskiti-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_TASKITI_APP'),
    });
  }

  async validate(payload: any) {
    if (payload.source !== 'taskiti') {
      throw new UnauthorizedException('Invalid token source');
    }
    return { userId: payload.sub, email: payload.email, name: payload.name };
  }
}
