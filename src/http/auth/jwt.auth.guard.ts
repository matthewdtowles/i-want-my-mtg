import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { getLogger } from 'src/logger/global-app-logger';
import { AUTH_TOKEN_NAME } from './dto/auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly LOGGER = getLogger(JwtAuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const hasBearerToken = request.headers.authorization?.startsWith('Bearer ');
        const hasCookieToken = !!request.cookies?.[AUTH_TOKEN_NAME];
        if (!hasBearerToken && !hasCookieToken) {
            this.LOGGER.debug(`No JWT found in Bearer header or cookies`);
            throw new UnauthorizedException('Authentication required');
        }
        return !!(await super.canActivate(context));
    }
}
