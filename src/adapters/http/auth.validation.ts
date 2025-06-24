import { UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from 'src/adapters/http/auth/dto/authenticated.request';

export function validateAuthenticatedRequest(req: AuthenticatedRequest): void {
    if (!req) {
        throw new UnauthorizedException('Request not found');
    }
    if (!req.user) {
        throw new UnauthorizedException('User not found in request');
    }
    if (!req.user.id) {
        throw new UnauthorizedException('User does not have valid ID');
    }
}