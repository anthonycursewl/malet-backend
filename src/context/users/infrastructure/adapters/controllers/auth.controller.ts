import {
  Controller,
  Get,
  Req,
  Post,
  Body,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUseCase } from 'src/context/users/application/auth.service';
import { LoginGoogleDto } from '../dtos/login-google.dto';
import {
  LOGIN_GOOGLE_USER_USECASE,
  LoginWithGoogleUseCase,
} from 'src/context/users/domain/ports/in/login-google-user.usecase';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authUseCase: AuthUseCase,
    @Inject(LOGIN_GOOGLE_USER_USECASE)
    private readonly loginWithGoogleUseCase: LoginWithGoogleUseCase,
  ) {}

  @Get('verify')
  async verify(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }
    return await this.authUseCase.validate(token);
  }

  @Post('google/mobile')
  async loginGoogle(@Body() body: LoginGoogleDto) {
    this.logger.log(`📱 Received Google login request from mobile.`);
    this.logger.debug(`Token length: ${body.idToken?.length}`);
    return await this.loginWithGoogleUseCase.execute(body.idToken);
  }
}
