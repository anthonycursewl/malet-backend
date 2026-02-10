import { Controller } from '@nestjs/common';
import { Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthUseCase } from 'src/context/users/application/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authUseCase: AuthUseCase) {}

  @Get('verify')
  async verify(@Req() req: Request) {
    const token = req.headers.authorization.split(' ')[1];
    return await this.authUseCase.validate(token);
  }
}
