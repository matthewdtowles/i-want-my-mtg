import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthServicePort } from "src/core/auth/api/auth.service.port";
import { UserDto } from "src/core/user/api/user.dto";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {

    private readonly LOGGER = new Logger(LocalStrategy.name);

    constructor(@Inject(AuthServicePort) private readonly authService: AuthServicePort) {
        super({
            usernameField: "email",
            passwordField: "password",
        });
        this.LOGGER.debug(`Initialized`);
    }

    async validate(email: string, password: string): Promise<UserDto> {
        this.LOGGER.debug(`Validate ${email}`);
        const user = await this.authService.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }
        return user;
    }
}
