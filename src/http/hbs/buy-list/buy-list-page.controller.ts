import { Controller, Get, Inject, Render, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BuyListViewDto } from './dto/buy-list.view.dto';
import { BuyListPageOrchestrator } from './buy-list-page.orchestrator';

@Controller('buy-list')
export class BuyListPageController {
    constructor(
        @Inject(BuyListPageOrchestrator) private readonly orchestrator: BuyListPageOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('buyList')
    async list(@Req() req: AuthenticatedRequest): Promise<BuyListViewDto> {
        return await this.orchestrator.buildListView(req);
    }
}
