import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/core/auth/jwt.strategy';
import { LocalStrategy } from 'src/core/auth/local.strategy';
import { UserModule } from 'src/core/user/user.module';
import { AuthService } from './auth.service';
import { AuthServicePort } from './ports/auth.service.port';

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
        JwtStrategy,
        LocalStrategy,
    ],
    exports: [
        AuthServicePort,
        JwtStrategy,
    ],
})
export class AuthModule {
    private readonly LOGGER: Logger = new Logger(AuthModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
