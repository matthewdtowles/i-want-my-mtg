import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { getLogger } from 'src/logger/global-app-logger';
import { AUTH_TOKEN_NAME } from './dto/auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly LOGGER = getLogger(JwtAuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const jwt = request.cookies[AUTH_TOKEN_NAME];
        if (!jwt) {
            this.LOGGER.error(`No JWT found in request cookies for token name: ${AUTH_TOKEN_NAME}`);
            return false;
        }
        return !!(await super.canActivate(context));
    }
}
