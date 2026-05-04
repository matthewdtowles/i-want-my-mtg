import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Render,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import { API_TIER_LIMITS } from 'src/core/api-tier/api-tier-limits';
import { ApiTier } from 'src/core/api-tier/api-tier.enum';
import { isEnumValue } from 'src/core/validation.util';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BaseViewDto } from 'src/http/base/base.view.dto';
import { getLogger } from 'src/logger/global-app-logger';

interface TierCardView {
    tier: ApiTier;
    label: string;
    pricePerMonth: string;
    perDay: number;
    perMinute: number;
    description: string;
    features: string[];
    isCurrent: boolean;
    isFree: boolean;
}

interface DeveloperPricingViewDto extends BaseViewDto {
    tiers: TierCardView[];
    notice: string | null;
    currentTier: ApiTier;
}

@Controller('developer')
export class DeveloperController {
    private readonly LOGGER = getLogger(DeveloperController.name);

    constructor(private readonly apiSubscriptionService: ApiSubscriptionService) {}

    @UseGuards(OptionalAuthGuard)
    @Get('pricing')
    @Render('developerPricing')
    async pricing(
        @Req() req: AuthenticatedRequest,
        @Query('error') error?: string
    ): Promise<DeveloperPricingViewDto> {
        const userId = req.user?.id;
        const currentTier = userId ? await this.apiSubscriptionService.getEffectiveTier(userId) : ApiTier.Free;
        const tiers: TierCardView[] = [
            {
                tier: ApiTier.Free,
                label: 'Free',
                pricePerMonth: '$0',
                perDay: API_TIER_LIMITS[ApiTier.Free].perDay,
                perMinute: API_TIER_LIMITS[ApiTier.Free].perMinute,
                description: 'For exploring the API and small personal scripts.',
                features: [
                    'Read access to public endpoints',
                    'Manage your own collection',
                    `${API_TIER_LIMITS[ApiTier.Free].perDay} requests/day`,
                    `${API_TIER_LIMITS[ApiTier.Free].perMinute}/minute burst`,
                    'Community support',
                ],
                isCurrent: currentTier === ApiTier.Free,
                isFree: true,
            },
            {
                tier: ApiTier.Developer,
                label: 'Developer',
                pricePerMonth: '$9.99',
                perDay: API_TIER_LIMITS[ApiTier.Developer].perDay,
                perMinute: API_TIER_LIMITS[ApiTier.Developer].perMinute,
                description: 'For Discord bots, hobby projects, and indie integrations.',
                features: [
                    'Everything in Free',
                    `${API_TIER_LIMITS[ApiTier.Developer].perDay.toLocaleString()} requests/day`,
                    `${API_TIER_LIMITS[ApiTier.Developer].perMinute}/minute burst`,
                    'Webhook support (coming soon)',
                    'Email support',
                ],
                isCurrent: currentTier === ApiTier.Developer,
                isFree: false,
            },
            {
                tier: ApiTier.Business,
                label: 'Business',
                pricePerMonth: '$29.99',
                perDay: API_TIER_LIMITS[ApiTier.Business].perDay,
                perMinute: API_TIER_LIMITS[ApiTier.Business].perMinute,
                description: 'For commercial apps, LGS tools, and high-volume services.',
                features: [
                    'Everything in Developer',
                    `${API_TIER_LIMITS[ApiTier.Business].perDay.toLocaleString()} requests/day`,
                    `${API_TIER_LIMITS[ApiTier.Business].perMinute}/minute burst`,
                    'Bulk endpoints (coming soon)',
                    'Priority support',
                ],
                isCurrent: currentTier === ApiTier.Business,
                isFree: false,
            },
        ];

        return Object.assign(
            new BaseViewDto({
                authenticated: !!userId,
                title: 'API Pricing — I Want My MTG',
                metaDescription: 'Pricing for the IWMM API: Free, Developer, and Business tiers.',
                indexable: true,
            }),
            {
                tiers,
                currentTier,
                notice: error ? this.errorMessage(error) : null,
            }
        ) as DeveloperPricingViewDto;
    }

    @UseGuards(JwtAuthGuard)
    @Post('billing/checkout')
    async checkout(
        @Body('tier') tierInput: string,
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        if (!isEnumValue(ApiTier, tierInput) || tierInput === ApiTier.Free) {
            res.redirect('/developer/pricing?error=invalid_tier');
            return;
        }
        try {
            const { url } = await this.apiSubscriptionService.startCheckout(
                req.user as never,
                tierInput as ApiTier
            );
            res.redirect(303, url);
        } catch (error) {
            this.LOGGER.error(`API checkout failed for user ${req.user?.id}: ${error?.message}`);
            res.redirect('/developer/pricing?error=checkout_failed');
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('billing/portal')
    async portal(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        try {
            const { url } = await this.apiSubscriptionService.startBillingPortal(req.user as never);
            res.redirect(303, url);
        } catch (error) {
            this.LOGGER.error(`API portal failed for user ${req.user?.id}: ${error?.message}`);
            res.redirect('/developer/pricing?error=portal_failed');
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get('billing/success')
    async success(
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
        @Query('session_id') sessionId?: string
    ): Promise<void> {
        if (sessionId) {
            await this.apiSubscriptionService.syncFromCheckoutSessionId(sessionId, req.user.id);
        }
        res.redirect(303, '/user/api-keys?upgraded=1');
    }

    private errorMessage(error: string): string | null {
        const messages: Record<string, string> = {
            invalid_tier: 'Please choose Developer or Business.',
            checkout_failed: 'Could not start checkout. Try again in a moment.',
            portal_failed: 'Could not open the billing portal. Try again in a moment.',
        };
        return messages[error] ?? null;
    }
}
