import { Inject, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserDto } from "../user/api/user.dto";
import { UserServicePort } from "../user/api/user.service.port";
import { AuthServicePort } from "./api/auth.service.port";
import { AuthToken, JwtPayload } from "./api/auth.types";

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
            user = await this.userService.findByEmail(email);
        }
        return user;
    }

    async login(user: UserDto): Promise<AuthToken> {
        if (!user) {
            throw new Error(`Login failure: user not found`);
        }
        if (!user.id) {
            throw new Error(`Login failure: user ID not found`);
        }
        const payload: JwtPayload = {
            email: user.email,
            sub: user.id.toString(),
            role: user.role,
        };
        const authToken: AuthToken = {
            access_token: await this.jwtService.signAsync(payload),
        };
        return authToken;
    }
}
