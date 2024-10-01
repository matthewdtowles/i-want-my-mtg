import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from 'src/core/auth/auth.types';
import { AuthServicePort } from 'src/core/auth/ports/auth.service.port';
import { JwtStrategyPort } from 'src/core/auth/ports/jwt.strategy.port';
import { UserDto } from 'src/core/user/dto/user.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) implements JwtStrategyPort {

    // TODO: config service ops are all in app module; is this the right place to extract the JWT SECRET?
    constructor(
        private readonly authService: AuthServicePort,
        private readonly configService: ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        });
    }

    // Decodes JWT payload and performs further validation if necessary
    // TODO: what to do about the empty properties? 
    async validate(payload: JwtPayload): Promise<UserDto> {
        const user: UserDto = await this.authService.validateCredentials(payload.email, payload.sub);
        if (!user) {
            // TODO: unauthz'd or unauthn'd?
            throw new UnauthorizedException();
        }
        return user;
    }

}