import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../../context/users/domain/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async generateToken(user: User): Promise<{ access_token: string }> {
    const payload = { 
      sub: user.getId(), 
      email: user.getEmail(),
      name: user.getName()
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validate(token: string): Promise<{ sub: string, email: string, name: string }> {
    const payload = await this.jwtService.verifyAsync(token);
    return payload;
  }
}
