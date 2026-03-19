import {
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CardService } from 'src/core/card/card.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SetService } from 'src/core/set/set.service';
import { Set } from 'src/core/set/set.entity';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { completionRate } from 'src/http/base/http.util';
import { SetApiResponseDto, SetPriceHistoryPointDto } from './dto/set-response.dto';
import { SetApiPresenter } from './set-api.presenter';
import { CardApiResponseDto } from '../card/dto/card-response.dto';
import { CardApiPresenter } from '../card/card-api.presenter';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { formatUtcDate } from 'src/http/base/date.util';
import { parseDaysParam } from 'src/http/base/query.util';

@ApiTags('Sets')
@Controller('api/v1/sets')
@UseGuards(ApiRateLimitGuard)
export class SetApiController {
    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService
    ) {}

    @Get()
    @UseGuards(OptionalAuthGuard)
    @ApiOperation({ summary: 'List sets' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'ascend', required: false })
    @ApiQuery({ name: 'filter', required: false, description: 'Filter sets by name' })
    @ApiQuery({ name: 'baseOnly', required: false, description: 'Show only base/main sets' })
    @ApiQuery({ name: 'q', required: false, description: 'Search query' })
    @ApiResponse({ status: 200, description: 'List of sets' })
    async findAll(
        @Req() req: AuthenticatedRequest,
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

        const userId = req.user?.id;
        let totalsMap = new Map<string, number>();
        let valuesMap = new Map<string, number>();

        if (userId) {
            const setCodes = sets.map((s) => s.code);
            [totalsMap, valuesMap] = await Promise.all([
                this.inventoryService.inventoryTotalsForSets(userId, setCodes),
                this.inventoryService.ownedValuesForSets(userId, setCodes),
            ]);
        }

        const data = sets.map((s) => {
            const dto = SetApiPresenter.toSetApiResponse(s);
            if (!userId) return dto;

            const ownedTotal = totalsMap.get(s.code) ?? 0;
            const ownedValue = valuesMap.get(s.code) ?? 0;

            return {
                ...dto,
                ownedTotal,
                ownedValue,
                completionRate: completionRate(ownedTotal, s.effectiveSize),
            };
        });

        return ApiResponseDto.ok(data, new PaginationMeta(options.page, options.limit, total));
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
        return ApiResponseDto.ok(SetApiPresenter.toSetApiResponse(set));
    }

    @Get(':code/cards')
    @ApiOperation({ summary: 'Get cards in a set' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'ascend', required: false })
    @ApiQuery({ name: 'filter', required: false, description: 'Filter cards by name' })
    @ApiQuery({ name: 'baseOnly', required: false, description: 'Show only base set cards' })
    @ApiResponse({ status: 200, description: 'Cards in set' })
    async findCardsInSet(
        @Param('code') code: string,
        @Query() query: Record<string, string>
    ): Promise<ApiResponseDto<CardApiResponseDto[]>> {
        const options = new SafeQueryOptions(query);

        const set = await this.setService.findByCode(code);
        const effectiveOptions = set && !set.isMain ? options.withBaseOnly(false) : options;

        const [cards, total] = await Promise.all([
            this.cardService.findBySet(code, effectiveOptions),
            this.cardService.totalInSet(code, effectiveOptions),
        ]);

        return ApiResponseDto.ok(
            cards.map((c) => CardApiPresenter.toCardApiResponse(c)),
            new PaginationMeta(effectiveOptions.page, effectiveOptions.limit, total)
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
        const validDays = parseDaysParam(days);
        const history = await this.setService.findSetPriceHistory(code, validDays);

        const points: SetPriceHistoryPointDto[] = history.map((h) => ({
            date: formatUtcDate(h.date),
            basePrice: h.basePrice,
            totalPrice: h.totalPrice,
            basePriceAll: h.basePriceAll,
            totalPriceAll: h.totalPriceAll,
        }));

        return ApiResponseDto.ok(points);
    }
}
