import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';

/**
 * Populates `subscribed` on view DTOs returned by HBS controllers so the
 * shared navbar partial can branch on subscription state without each
 * orchestrator having to fetch and pass it through.
 */
@Injectable()
export class SubscriptionViewInterceptor implements NestInterceptor {
    constructor(
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const userId = req?.user?.id;
        return next.handle().pipe(
            mergeMap(async (data) => {
                if (!userId || !this.isViewObject(data)) return data;
                if (typeof data.subscribed === 'boolean') return data;
                try {
                    (data as { subscribed?: boolean }).subscribed =
                        await this.subscriptionService.isUserSubscribed(userId);
                } catch {
                    // best-effort enrichment; never fail page render on subscription lookup
                }
                return data;
            })
        );
    }

    private isViewObject(data: unknown): data is Record<string, unknown> {
        return !!data && typeof data === 'object' && !Array.isArray(data);
    }
}
