import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserDto } from '../user/dto/user.dto';
import { UserServicePort } from '../user/ports/user.service.port';
import { AuthToken, JwtPayload } from './auth.types';
import { AuthServicePort } from './ports/auth.service.port';

@Injectable()
export class AuthService implements AuthServicePort {

  constructor(
    @Inject(UserServicePort) private readonly userService: UserServicePort,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) { }

  async validateUser(email: string, password: string): Promise<UserDto | null> {
    const encryptedPwd: string = await this.userService.findSavedPassword(email);
    if (encryptedPwd && await bcrypt.compare(password, encryptedPwd)) {
      return await this.userService.findByEmail(email);
    }
    return null;
  }

  async login(user: UserDto): Promise<AuthToken> {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id.toString(),
    }
    const authToken: AuthToken = {
      access_token: await this.jwtService.signAsync(payload)
    }
    return authToken;
  }

}
