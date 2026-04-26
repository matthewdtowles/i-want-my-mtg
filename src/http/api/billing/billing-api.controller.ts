import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlreadySubscribedError } from 'src/core/billing/already-subscribed.error';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { UserService } from 'src/core/user/user.service';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { CheckoutRequestDto } from './dto/checkout.request.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('api/v1/billing')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
export class BillingApiController {
    private readonly LOGGER = getLogger(BillingApiController.name);

    constructor(
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
        @Inject(UserService) private readonly userService: UserService
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get current subscription summary' })
    async getSubscription(@Req() req: AuthenticatedRequest) {
        const sub = await this.subscriptionService.getSubscriptionForUser(req.user.id);
        return ApiResponseDto.ok({
            subscription: sub
                ? {
                      status: sub.status,
                      plan: sub.plan,
                      currentPeriodEnd: sub.currentPeriodEnd
                          ? sub.currentPeriodEnd.toISOString()
                          : null,
                      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
                      isActive: sub.isActive(),
                  }
                : null,
        });
    }

    @Post('checkout')
    @ApiOperation({ summary: 'Create a Stripe Checkout session for the given plan' })
    async checkout(@Body() dto: CheckoutRequestDto, @Req() req: AuthenticatedRequest) {
        try {
            const user = await this.userService.findById(req.user.id);
            if (!user) return ApiResponseDto.error('User not found.');
            const result = await this.subscriptionService.startCheckout(user, dto.plan);
            return ApiResponseDto.ok(result);
        } catch (error) {
            if (error instanceof AlreadySubscribedError) {
                return ApiResponseDto.error(
                    'You already have an active subscription. Use the billing portal to change plans or cancel.'
                );
            }
            this.LOGGER.error(`Checkout failed for user ${req.user?.id}: ${error?.message}`);
            return ApiResponseDto.error('Checkout session could not be created.');
        }
    }

    @Post('portal')
    @ApiOperation({ summary: 'Create a Stripe Billing Portal session' })
    async portal(@Req() req: AuthenticatedRequest) {
        try {
            const user = await this.userService.findById(req.user.id);
            if (!user) return ApiResponseDto.error('User not found.');
            const result = await this.subscriptionService.startBillingPortal(user);
            return ApiResponseDto.ok(result);
        } catch (error) {
            this.LOGGER.error(`Portal failed for user ${req.user?.id}: ${error?.message}`);
            return ApiResponseDto.error('Billing portal session could not be created.');
        }
    }
}
