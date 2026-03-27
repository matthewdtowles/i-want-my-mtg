import { Controller, Get, Inject, Param, Query, Render, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { buildCardUrl } from 'src/http/base/http.util';
import { buildBreadcrumbJsonLd, buildCardJsonLd, buildJsonLd } from 'src/http/base/json-ld.util';
import { parseDaysParam } from 'src/http/base/query.util';
import { getLogger } from 'src/logger/global-app-logger';
import { CardOrchestrator } from './card.orchestrator';
import { CardViewDto } from './dto/card.view.dto';
import { PriceHistoryResponseDto } from './dto/price-history-response.dto';

@Controller('card')
export class CardController {
    private readonly LOGGER = getLogger(CardController.name);
    private readonly appUrl: string;

    constructor(
        @Inject(CardOrchestrator) private readonly cardOrchestrator: CardOrchestrator,
        private readonly configService: ConfigService
    ) {
        this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    }

    @Get(':cardId/price-history')
    async getPriceHistory(
        @Param('cardId') cardId: string,
        @Query('days') days?: string
    ): Promise<PriceHistoryResponseDto> {
        this.LOGGER.log(`Get price history for card ${cardId}.`);
        return this.cardOrchestrator.getPriceHistory(cardId, parseDaysParam(days));
    }

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
        const cardName = view.card?.name || 'Card';
        const setName = view.card?.setName || setCode.toUpperCase();
        const cardUrl = buildCardUrl(setCode, setNumber);
        view.title = `${cardName} (${setName}) — I Want My MTG`;
        view.metaDescription = `${cardName} from ${setName} — prices, legalities, and other printings.`;
        view.indexable = true;
        view.lcpImageUrl = view.card?.imgSrc;
        view.canonicalUrl = `${this.appUrl}${cardUrl}`;
        view.ogImage = view.card?.imgSrc;
        view.jsonLd = buildJsonLd(
            buildCardJsonLd(this.appUrl, view.card, cardUrl),
            buildBreadcrumbJsonLd(this.appUrl, view.breadcrumbs)
        );
        return view;
    }
}
