import { Controller, Get, Inject, Render, Req, UseGuards } from '@nestjs/common';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PricingViewDto } from './dto/pricing.view.dto';
import { PricingOrchestrator } from './pricing.orchestrator';

@Controller('pricing')
export class PricingController {
    constructor(@Inject(PricingOrchestrator) private readonly orchestrator: PricingOrchestrator) {}

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('pricing')
    async view(@Req() req: AuthenticatedRequest): Promise<PricingViewDto> {
        return this.orchestrator.getPricingView(req);
    }
}
