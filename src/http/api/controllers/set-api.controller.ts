import { Controller, Get, Inject, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CardService } from 'src/core/card/card.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SetService } from 'src/core/set/set.service';
import { Set } from 'src/core/set/set.entity';
import { Card } from 'src/core/card/card.entity';
import { ApiResponseDto, PaginationMeta } from '../dto/api-response.dto';
import { SetApiResponseDto, SetPriceHistoryPointDto } from '../dto/set-response.dto';
import { CardApiResponseDto } from '../dto/card-response.dto';
import { ApiRateLimitGuard } from '../guards/api-rate-limit.guard';

@ApiTags('Sets')
@Controller('api/v1/sets')
@UseGuards(ApiRateLimitGuard)
export class SetApiController {
    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(CardService) private readonly cardService: CardService
    ) {}

    @Get()
    @ApiOperation({ summary: 'List sets' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'ascend', required: false })
    @ApiQuery({ name: 'q', required: false, description: 'Search query' })
    @ApiResponse({ status: 200, description: 'List of sets' })
    async findAll(
        @Query() query: Record<string, string>
    ): Promise<ApiResponseDto<SetApiResponseDto[]>> {
        const options = new SafeQueryOptions(query);
        const searchTerm = query.q;

        let sets: Set[];
        let total: number;

        if (searchTerm) {
            [sets, total] = await Promise.all([
                this.setService.searchSets(searchTerm, options),
                this.setService.totalSearchSets(searchTerm),
            ]);
        } else {
            [sets, total] = await Promise.all([
                this.setService.findSets(options),
                this.setService.totalSetsCount(options),
            ]);
        }

        return ApiResponseDto.ok(
            sets.map((s) => this.toSetResponse(s)),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    @Get(':code')
    @ApiOperation({ summary: 'Get set detail by code' })
    @ApiResponse({ status: 200, description: 'Set detail' })
    @ApiResponse({ status: 404, description: 'Set not found' })
    async findByCode(@Param('code') code: string): Promise<ApiResponseDto<SetApiResponseDto>> {
        const set = await this.setService.findByCode(code);
        if (!set) {
            throw new NotFoundException('Set not found');
        }
        return ApiResponseDto.ok(this.toSetResponse(set));
    }

    @Get(':code/cards')
    @ApiOperation({ summary: 'Get cards in a set' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'ascend', required: false })
    @ApiResponse({ status: 200, description: 'Cards in set' })
    async findCardsInSet(
        @Param('code') code: string,
        @Query() query: Record<string, string>
    ): Promise<ApiResponseDto<CardApiResponseDto[]>> {
        const options = new SafeQueryOptions(query);

        const [cards, total] = await Promise.all([
            this.cardService.findBySet(code, options),
            this.cardService.totalInSet(code, options),
        ]);

        return ApiResponseDto.ok(
            cards.map((c) => this.toCardResponse(c)),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    @Get(':code/price-history')
    @ApiOperation({ summary: 'Get set price history' })
    @ApiQuery({ name: 'days', required: false, description: 'Number of days of history' })
    @ApiResponse({ status: 200, description: 'Set price history data' })
    async getPriceHistory(
        @Param('code') code: string,
        @Query('days') days?: string
    ): Promise<ApiResponseDto<SetPriceHistoryPointDto[]>> {
        const parsedDays = days ? parseInt(days, 10) : undefined;
        const validDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : undefined;
        const history = await this.setService.findSetPriceHistory(code, validDays);

        const points: SetPriceHistoryPointDto[] = history.map((h) => ({
            date:
                h.date instanceof Date
                    ? `${h.date.getUTCFullYear()}-${String(h.date.getUTCMonth() + 1).padStart(2, '0')}-${String(h.date.getUTCDate()).padStart(2, '0')}`
                    : String(h.date),
            basePrice: h.basePrice,
            totalPrice: h.totalPrice,
            basePriceAll: h.basePriceAll,
            totalPriceAll: h.totalPriceAll,
        }));

        return ApiResponseDto.ok(points);
    }

    private toSetResponse(set: Set): SetApiResponseDto {
        return {
            code: set.code,
            name: set.name,
            type: set.type,
            releaseDate: set.releaseDate,
            baseSize: set.baseSize,
            totalSize: set.totalSize,
            keyruneCode: set.keyruneCode,
            block: set.block,
            prices: set.prices
                ? {
                      basePrice: set.prices.basePrice,
                      totalPrice: set.prices.totalPrice,
                      basePriceAll: set.prices.basePriceAll,
                      totalPriceAll: set.prices.totalPriceAll,
                      basePriceChangeWeekly: set.prices.basePriceChangeWeekly,
                      totalPriceChangeWeekly: set.prices.totalPriceChangeWeekly,
                  }
                : undefined,
        };
    }

    private toCardResponse(card: Card): CardApiResponseDto {
        const latestPrice = card.prices?.[0];
        return {
            id: card.id,
            name: card.name,
            setCode: card.setCode,
            number: card.number,
            type: card.type,
            rarity: card.rarity,
            manaCost: card.manaCost,
            oracleText: card.oracleText,
            artist: card.artist,
            imgSrc: card.imgSrc,
            hasFoil: card.hasFoil,
            hasNonFoil: card.hasNonFoil,
            prices: latestPrice
                ? {
                      normal: latestPrice.normal != null ? Number(latestPrice.normal) : null,
                      foil: latestPrice.foil != null ? Number(latestPrice.foil) : null,
                  }
                : undefined,
            setName: card.set?.name,
        };
    }
}
