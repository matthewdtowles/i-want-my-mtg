import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Inject,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { REQUIRES_SUBSCRIPTION_KEY } from './requires-subscription.decorator';
import { SubscriptionService } from './subscription.service';

/**
 * Guard that allows a request only when the authenticated user has an active subscription.
 * Intended to be combined with JwtAuthGuard. Currently unused — scaffolding for future premium
 * features.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required = this.reflector.getAllAndOverride<boolean>(REQUIRES_SUBSCRIPTION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required) return true;

        const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
        if (!req?.user?.id) {
            throw new UnauthorizedException('Authentication required.');
        }
        const subscription = await this.subscriptionService.getSubscriptionForUser(req.user.id);
        if (!subscription || !subscription.isActive()) {
            throw new ForbiddenException('Active subscription required.');
        }
        return true;
    }
}
