import { Controller, Get, Inject, Render, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PriceAlertListViewDto } from './dto/price-alert-list.view.dto';
import { PriceAlertPageOrchestrator } from './price-alert-page.orchestrator';

@Controller('price-alerts')
export class PriceAlertPageController {
    constructor(
        @Inject(PriceAlertPageOrchestrator)
        private readonly orchestrator: PriceAlertPageOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('priceAlerts')
    async list(@Req() req: AuthenticatedRequest): Promise<PriceAlertListViewDto> {
        return await this.orchestrator.buildListView(req);
    }
}
