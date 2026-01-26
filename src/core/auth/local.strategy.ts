import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { User } from 'src/core/user/user.entity';
import { getLogger } from 'src/logger/global-app-logger';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    private readonly LOGGER = getLogger(LocalStrategy.name);

    constructor(@Inject(AuthService) private readonly authService: AuthService) {
        super({
            usernameField: 'email',
            passwordField: 'password',
        });
        this.LOGGER.log(`Initialized`);
    }

    async validate(email: string, password: string): Promise<User> {
        this.LOGGER.debug(`Validate ${email}`);
        const user = await this.authService.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return user;
    }
}
