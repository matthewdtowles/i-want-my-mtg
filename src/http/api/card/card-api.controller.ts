import {
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CardService } from 'src/core/card/card.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { CardPresenter } from 'src/http/hbs/card/card.presenter';
import { parseDaysParam } from 'src/http/base/query.util';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { CardApiResponseDto, PriceHistoryPointDto } from './dto/card-response.dto';
import { CardApiPresenter } from './card-api.presenter';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';

@ApiTags('Cards')
@Controller('api/v1/cards')
@UseGuards(ApiRateLimitGuard)
export class CardApiController {
    constructor(@Inject(CardService) private readonly cardService: CardService) {}

    @Get()
    @ApiOperation({ summary: 'Search cards by name' })
    @ApiQuery({ name: 'q', required: true, description: 'Search query' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'ascend', required: false })
    @ApiResponse({ status: 200, description: 'Search results' })
    async search(
        @Query() query: Record<string, string>
    ): Promise<ApiResponseDto<CardApiResponseDto[]>> {
        const options = new SafeQueryOptions(query);
        const searchTerm = query.q || '';
        if (!searchTerm) {
            return ApiResponseDto.ok([], new PaginationMeta(1, options.limit, 0));
        }

        const [cards, total] = await Promise.all([
            this.cardService.searchByName(searchTerm, options),
            this.cardService.totalSearchByName(searchTerm),
        ]);

        return ApiResponseDto.ok(
            cards.map((c) => CardApiPresenter.toCardApiResponse(c)),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    @Get(':cardId/prices')
    @ApiOperation({ summary: 'Get current prices for a card by ID' })
    @ApiResponse({ status: 200, description: 'Card prices' })
    async getPricesById(
        @Param('cardId') cardId: string
    ): Promise<ApiResponseDto<CardApiResponseDto>> {
        const cards = await this.cardService.findByIdsWithPrices([cardId]);
        if (!cards || cards.length === 0) {
            throw new NotFoundException('Card not found');
        }
        return ApiResponseDto.ok(CardApiPresenter.toCardApiResponse(cards[0]));
    }

    @Get(':cardId/price-history')
    @ApiOperation({ summary: 'Get price history for a card by ID' })
    @ApiQuery({ name: 'days', required: false, description: 'Number of days of history' })
    @ApiResponse({ status: 200, description: 'Price history data' })
    async getPriceHistoryById(
        @Param('cardId') cardId: string,
        @Query('days') days?: string
    ): Promise<ApiResponseDto<PriceHistoryPointDto[]>> {
        return this.getPriceHistoryForCard(cardId, days);
    }

    @Get(':setCode/:setNumber/prices')
    @ApiOperation({ summary: 'Get current prices for a card by set code and number' })
    @ApiResponse({ status: 200, description: 'Card prices' })
    @ApiResponse({ status: 404, description: 'Card not found' })
    async getPricesBySetCodeAndNumber(
        @Param('setCode') setCode: string,
        @Param('setNumber') setNumber: string
    ): Promise<ApiResponseDto<CardApiResponseDto>> {
        const card = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
        if (!card) {
            throw new NotFoundException('Card not found');
        }
        const cardsWithPrices = await this.cardService.findByIdsWithPrices([card.id]);
        if (!cardsWithPrices || cardsWithPrices.length === 0) {
            throw new NotFoundException('Card not found');
        }
        return ApiResponseDto.ok(CardApiPresenter.toCardApiResponse(cardsWithPrices[0]));
    }

    @Get(':setCode/:setNumber/price-history')
    @ApiOperation({ summary: 'Get price history for a card by set code and number' })
    @ApiQuery({ name: 'days', required: false, description: 'Number of days of history' })
    @ApiResponse({ status: 200, description: 'Price history data' })
    @ApiResponse({ status: 404, description: 'Card not found' })
    async getPriceHistoryBySetCodeAndNumber(
        @Param('setCode') setCode: string,
        @Param('setNumber') setNumber: string,
        @Query('days') days?: string
    ): Promise<ApiResponseDto<PriceHistoryPointDto[]>> {
        const card = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
        if (!card) {
            throw new NotFoundException('Card not found');
        }
        return this.getPriceHistoryForCard(card.id, days);
    }

    @Get(':setCode/:setNumber')
    @ApiOperation({ summary: 'Get card by set code and collector number' })
    @ApiResponse({ status: 200, description: 'Card detail' })
    @ApiResponse({ status: 404, description: 'Card not found' })
    async findBySetCodeAndNumber(
        @Param('setCode') setCode: string,
        @Param('setNumber') setNumber: string
    ): Promise<ApiResponseDto<CardApiResponseDto>> {
        const card = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
        if (!card) {
            throw new NotFoundException('Card not found');
        }
        return ApiResponseDto.ok(CardApiPresenter.toCardApiResponse(card));
    }

    private async getPriceHistoryForCard(
        cardId: string,
        days?: string
    ): Promise<ApiResponseDto<PriceHistoryPointDto[]>> {
        const validDays = parseDaysParam(days);
        const prices = await this.cardService.findPriceHistory(cardId, validDays);
        const points: PriceHistoryPointDto[] = prices.map(CardPresenter.toPriceHistoryPoint);
        return ApiResponseDto.ok(points);
    }
}
