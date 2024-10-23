import { Inject, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserDto } from "../user/dto/user.dto";
import { UserServicePort } from "../user/ports/user.service.port";
import { AuthToken, JwtPayload } from "./auth.types";
import { AuthServicePort } from "./ports/auth.service.port";

@Injectable()
export class AuthService implements AuthServicePort {
  private readonly LOGGER: Logger = new Logger(AuthService.name);

  constructor(
    @Inject(UserServicePort) private readonly userService: UserServicePort,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) { }

  async validateUser(email: string, password: string): Promise<UserDto | null> {
    this.LOGGER.debug(`Attempt to authenticate ${email}`);
    const encPwd: string = await this.userService.findSavedPassword(email);
    let user: UserDto = null;
    if (encPwd && (await bcrypt.compare(password, encPwd))) {
      this.LOGGER.debug(`Encryption successful`);
      user = await this.userService.findByEmail(email);
    }
    this.LOGGER.debug(`Validated user: ${JSON.stringify(user)}`);
    return user;
  }

  async login(user: UserDto): Promise<AuthToken> {
    if (!user) {
      const msg = `Login failure: user not found`;
      this.LOGGER.error(msg);
      throw new Error(msg);
    }
    if (!user.id) {
      const msg = `Login failure: user ID not found`;
      this.LOGGER.error(msg);
      throw new Error(msg);
    }
    this.LOGGER.debug(`Create auth token for ${JSON.stringify(user)}`);
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id.toString(),
      role: user.role,
    };
    this.LOGGER.debug(`Payload: ${JSON.stringify(payload)}`);
    const authToken: AuthToken = {
      access_token: await this.jwtService.signAsync(payload),
    };
    this.LOGGER.debug(`Token: ${JSON.stringify(authToken)}`);
    return authToken;
  }
}
