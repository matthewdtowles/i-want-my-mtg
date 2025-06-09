import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "src/core/auth";
import { User } from "src/core/user";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {

    private readonly LOGGER = new Logger(LocalStrategy.name);

    constructor(@Inject(AuthService) private readonly authService: AuthService) {
        super({
            usernameField: "email",
            passwordField: "password",
        });
        this.LOGGER.debug(`Initialized`);
    }

    async validate(email: string, password: string): Promise<User> {
        this.LOGGER.debug(`Validate ${email}`);
        const user = await this.authService.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }
        return user;
    }
}
