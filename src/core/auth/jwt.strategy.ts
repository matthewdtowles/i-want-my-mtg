import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from 'src/core/auth/auth.types';
import { UserDto } from 'src/core/user/dto/user.dto';
import { UserServicePort } from 'src/core/user/ports/user.service.port';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(
        @Inject(UserServicePort) private readonly userService: UserServicePort, 
        private readonly configService: ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('JWT_SECRET'),
            ignoreExpiration: false,
        });
    }

    async validate(payload: JwtPayload): Promise<UserDto> {
        const user: UserDto = await this.userService.findById(parseInt(payload.sub));
        if (!user) {
            throw new UnauthorizedException();
        }
        return user; // attach to req
    }
}