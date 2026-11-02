import { Controller, Get, Inject, Param, Query, Render, Req, UseGuards } from '@nestjs/common';
import { SharedCacheTTL } from 'src/http/api/shared/cache-control.interceptor';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { parseDaysParam } from 'src/http/base/query.util';
import { getLogger } from 'src/logger/global-app-logger';
import { CardOrchestrator } from './card.orchestrator';
import { CardViewDto } from './dto/card.view.dto';
import { PriceHistoryResponseDto } from './dto/price-history-response.dto';

@Controller('card')
export class CardController {
    private readonly LOGGER = getLogger(CardController.name);

    constructor(@Inject(CardOrchestrator) private readonly cardOrchestrator: CardOrchestrator) {}

    @Get(':cardId/price-history')
    async getPriceHistory(
        @Param('cardId') cardId: string,
        @Query('days') days?: string
    ): Promise<PriceHistoryResponseDto> {
        this.LOGGER.log(`Get price history for card ${cardId}.`);
        return this.cardOrchestrator.getPriceHistory(cardId, parseDaysParam(days));
    }

    // Prices change once a day, so CloudFront can serve a signed-out card page for an hour.
    // A crawl of every card page took the site down on 2026-11-01; each page it reaches
    // now costs the database once an hour instead of once a minute.
    @SharedCacheTTL(3600)
    @UseGuards(OptionalAuthGuard)
    @Get(':setCode/:setNumber')
    @Render('card')
    async findSetCard(
        @Req() req: AuthenticatedRequest,
        @Param('setCode') setCode: string,
        @Param('setNumber') setNumber: string
    ): Promise<CardViewDto> {
        this.LOGGER.log(`Find set card ${setCode}/${setNumber}.`);
        const view = await this.cardOrchestrator.findSetCard(req, setCode, setNumber);
        this.LOGGER.log(`Found set card ${setCode}/${setNumber} -> ID: ${view?.card?.cardId}.`);
        return view;
    }
}
