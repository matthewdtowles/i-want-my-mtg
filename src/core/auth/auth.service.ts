import { Inject, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthToken, JwtPayload } from "src/core/auth";
import { User, UserService } from "src/core/user";


@Injectable()
export class AuthService implements AuthService {
    private readonly LOGGER: Logger = new Logger(AuthService.name);

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(JwtService) private readonly jwtService: JwtService,
    ) { }

    async validateUser(email: string, password: string): Promise<User | null> {
        this.LOGGER.debug(`Attempt to authenticate ${email}`);
        const encPwd: string = await this.userService.findSavedPassword(email);
        let user: User = null;
        if (encPwd && (await bcrypt.compare(password, encPwd))) {
            user = await this.userService.findByEmail(email);
        }
        return user;
    }

    async login(user: User): Promise<AuthToken> {
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
