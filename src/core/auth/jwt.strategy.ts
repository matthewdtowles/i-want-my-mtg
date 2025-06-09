import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload } from "src/core/auth/auth.types";
import { UserDto, UserService } from "src/core/user";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    private readonly LOGGER = new Logger(JwtStrategy.name);

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>("JWT_SECRET"),
            ignoreExpiration: false,
        });
        this.LOGGER.debug(`Initialized`);
    }

    async validate(payload: JwtPayload): Promise<UserDto> {
        this.LOGGER.debug(`Validate`);
        const user: UserDto = await this.userService.findById(parseInt(payload.sub));
        if (!user) {
            throw new UnauthorizedException();
        }
        return user; // attach to req
    }
}
