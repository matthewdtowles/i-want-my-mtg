import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionPlan } from 'src/core/billing/subscription-plan.enum';
import { Subscription } from 'src/core/billing/subscription.entity';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { getLogger } from 'src/logger/global-app-logger';
import { BillingViewDto, SubscriptionSummary } from './dto/billing.view.dto';

@Injectable()
export class BillingOrchestrator {
    private readonly LOGGER = getLogger(BillingOrchestrator.name);

    private readonly breadCrumbs = [
        { label: 'Home', url: '/' },
        { label: 'User', url: '/user' },
        { label: 'Subscription', url: '/billing' },
    ];

    constructor(
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
        @Inject(UserService) private readonly userService: UserService
    ) {}

    async getBillingView(req: AuthenticatedRequest): Promise<BillingViewDto> {
        const subscription = await this.subscriptionService.getSubscriptionForUser(req.user.id);
        return new BillingViewDto({
            authenticated: req.isAuthenticated(),
            breadcrumbs: this.breadCrumbs,
            indexable: false,
            title: 'Subscription - I Want My MTG',
            subscription: this.toSummary(subscription),
        });
    }

    async startCheckout(
        req: AuthenticatedRequest,
        plan: SubscriptionPlan
    ): Promise<{ url: string }> {
        const user = await this.loadUser(req);
        return this.subscriptionService.startCheckout(user, plan);
    }

    async startBillingPortal(req: AuthenticatedRequest): Promise<{ url: string }> {
        const user = await this.loadUser(req);
        return this.subscriptionService.startBillingPortal(user);
    }

    private async loadUser(req: AuthenticatedRequest): Promise<User> {
        const user = await this.userService.findById(req.user.id);
        if (!user) {
            throw new Error(`User ${req.user.id} not found.`);
        }
        return user;
    }

    private toSummary(sub: Subscription | null): SubscriptionSummary | null {
        if (!sub) return null;
        return {
            status: sub.status,
            plan: sub.plan,
            currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            isActive: sub.isActive(),
        };
    }
}
