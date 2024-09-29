import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from 'src/core/user/user.module';
import { AuthServicePort } from './ports/auth.service.port';
import { AuthService } from './auth.service';
import { JwtStrategyPort } from './ports/jwt.strategy.port';
import { JwtStrategy } from 'src/adapters/http/auth/jwt.strategy';

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '60m' },
        }),
    ],
    providers: [
        {
            provide: AuthServicePort,
            useClass: AuthService,
        },
        {
            provide: JwtStrategyPort,
            useClass: JwtStrategy,
        }
    ],
    exports: [
        AuthService
    ],
})
export class AuthModule {
    private readonly LOGGER: Logger = new Logger(AuthModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}