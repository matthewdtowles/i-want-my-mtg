import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthServicePort } from "src/core/auth/api/auth.service.port";
import { UserDto } from "src/core/user/api/user.dto";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(@Inject(AuthServicePort) private readonly authService: AuthServicePort) {
        super({
            usernameField: "email",
            passwordField: "password",
        });
    }

    async validate(email: string, password: string): Promise<UserDto> {
        const user = await this.authService.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }
        return user;
    }
}
