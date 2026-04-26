import { Body, Controller, Get, Inject, Post, Query, Render, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AlreadySubscribedError } from 'src/core/billing/already-subscribed.error';
import { SubscriptionPlan } from 'src/core/billing/subscription-plan.enum';
import { isEnumValue } from 'src/core/validation.util';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { getLogger } from 'src/logger/global-app-logger';
import { BillingNotice, BillingViewDto } from './dto/billing.view.dto';
import { BillingOrchestrator } from './billing.orchestrator';

const ERROR_MESSAGES: Record<string, string> = {
    invalid_plan: 'That plan is not recognized. Please choose Monthly or Annual.',
    checkout_failed: 'We could not start checkout. Please try again in a moment.',
    portal_failed: 'We could not open the billing portal. Please try again in a moment.',
};

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
    private readonly LOGGER = getLogger(BillingController.name);

    constructor(@Inject(BillingOrchestrator) private readonly orchestrator: BillingOrchestrator) {}

    @Get()
    @Render('billing')
    async view(
        @Req() req: AuthenticatedRequest,
        @Query('error') error?: string
    ): Promise<BillingViewDto> {
        this.LOGGER.log(`Billing view for user ${req.user?.id}.`);
        const view = await this.orchestrator.getBillingView(req);
        const notice = this.errorNotice(error);
        return notice ? new BillingViewDto({ ...view, notice }) : view;
    }

    @Post('checkout')
    async checkout(
        @Body('plan') planInput: string,
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        if (!isEnumValue(SubscriptionPlan, planInput)) {
            res.redirect('/billing?error=invalid_plan');
            return;
        }
        try {
            const { url } = await this.orchestrator.startCheckout(req, planInput);
            res.redirect(303, url);
        } catch (error) {
            if (error instanceof AlreadySubscribedError) {
                try {
                    const { url } = await this.orchestrator.startBillingPortal(req);
                    res.redirect(303, url);
                    return;
                } catch (portalError) {
                    this.LOGGER.error(
                        `Portal redirect failed for already-subscribed user ${req.user?.id}: ${portalError?.message}`
                    );
                    res.redirect('/billing?error=portal_failed');
                    return;
                }
            }
            this.LOGGER.error(`Checkout failed for user ${req.user?.id}: ${error?.message}`);
            res.redirect('/billing?error=checkout_failed');
        }
    }

    @Post('portal')
    async portal(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        try {
            const { url } = await this.orchestrator.startBillingPortal(req);
            res.redirect(303, url);
        } catch (error) {
            this.LOGGER.error(`Portal failed for user ${req.user?.id}: ${error?.message}`);
            res.redirect('/billing?error=portal_failed');
        }
    }

    @Get('success')
    @Render('billing')
    async success(@Req() req: AuthenticatedRequest): Promise<BillingViewDto> {
        this.LOGGER.log(`Billing success landing for user ${req.user?.id}.`);
        const view = await this.orchestrator.getBillingView(req);
        const message = view.subscription?.isActive
            ? 'Your subscription is active. Thanks for supporting I Want My MTG!'
            : 'Payment received. Your subscription is being activated — this usually takes a few seconds. Refresh if it does not appear shortly.';
        const notice: BillingNotice = { type: 'success', message };
        return new BillingViewDto({ ...view, title: 'Subscription Active - I Want My MTG', notice });
    }

    @Get('canceled')
    @Render('billing')
    async canceled(@Req() req: AuthenticatedRequest): Promise<BillingViewDto> {
        const view = await this.orchestrator.getBillingView(req);
        const notice: BillingNotice = {
            type: 'info',
            message: 'Checkout was canceled. You have not been charged.',
        };
        return new BillingViewDto({ ...view, notice });
    }

    private errorNotice(error?: string): BillingNotice | null {
        if (!error) return null;
        const message = ERROR_MESSAGES[error];
        return message ? { type: 'error', message } : null;
    }
}
