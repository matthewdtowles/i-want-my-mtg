import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { AUTH_TOKEN_NAME } from 'src/http/auth/dto/auth.types';
import { getLogger } from 'src/logger/global-app-logger';
import { JwtPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly LOGGER = getLogger(JwtStrategy.name);

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {
        super({
            jwtFromRequest: (request) => {
                if (request && request.cookies) {
                    const jwt = request.cookies[AUTH_TOKEN_NAME];
                    this.LOGGER.debug(`Extracting JWT from cookie: ${jwt ? 'found' : 'not found'}`);
                    return jwt;
                }
                this.LOGGER.debug(`No cookies found in request`);
                return null;
            },
            secretOrKey: configService.get<string>('JWT_SECRET'),
            ignoreExpiration: false,
        });
        this.LOGGER.debug(`JWT Strategy initialized - reading from cookies`);
    }

    async validate(payload: JwtPayload): Promise<User> {
        this.LOGGER.debug(`Validating JWT payload for user`);
        const user: User = await this.userService.findById(parseInt(payload.sub));
        if (!user) {
            this.LOGGER.error(`User not found for JWT payload`);
            throw new UnauthorizedException();
        }
        this.LOGGER.debug(`JWT validation successful for user: ${user.email}`);
        return user; // attach to req
    }
}
