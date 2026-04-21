import { Body, Controller, Get, Inject, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SubscriptionPlan } from 'src/core/billing/subscription-plan.enum';
import { isEnumValue } from 'src/core/validation.util';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { getLogger } from 'src/logger/global-app-logger';
import { BillingViewDto } from './dto/billing.view.dto';
import { BillingOrchestrator } from './billing.orchestrator';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
    private readonly LOGGER = getLogger(BillingController.name);

    constructor(@Inject(BillingOrchestrator) private readonly orchestrator: BillingOrchestrator) {}

    @Get()
    @Render('billing')
    async view(@Req() req: AuthenticatedRequest): Promise<BillingViewDto> {
        this.LOGGER.log(`Billing view for user ${req.user?.id}.`);
        return this.orchestrator.getBillingView(req);
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
        return new BillingViewDto({ ...view, title: 'Subscription Active - I Want My MTG' });
    }

    @Get('canceled')
    @Render('billing')
    async canceled(@Req() req: AuthenticatedRequest): Promise<BillingViewDto> {
        return this.orchestrator.getBillingView(req);
    }
}
