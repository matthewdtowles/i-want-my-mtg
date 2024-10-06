import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from 'src/core/user/user.module';
import { AuthServicePort } from './ports/auth.service.port';
import { AuthService } from './auth.service';
import { JwtStrategyPort } from './ports/jwt.strategy.port';
import { JwtStrategy } from 'src/adapters/http/auth/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from 'src/adapters/http/auth/local.strategy';
import { LocalStrategyPort } from './ports/local.strategy.port';

@Module({
    imports: [
        ConfigModule,
        UserModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '60m' },
            }),
            inject: [ConfigService],
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
        },
        {
            provide: LocalStrategyPort,
            useClass: LocalStrategy
        }
    ],
    exports: [
        AuthServicePort,
        JwtStrategyPort,
    ],
})
export class AuthModule {
    private readonly LOGGER: Logger = new Logger(AuthModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
