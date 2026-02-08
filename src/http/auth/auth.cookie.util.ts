import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

export function getAuthCookieOptions(configService: ConfigService): CookieOptions {
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    return {
        httpOnly: true,
        sameSite: 'strict',
        secure: isProduction,
        maxAge: 3600000,
        path: '/',
    };
}