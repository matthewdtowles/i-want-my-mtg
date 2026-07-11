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
import { ApiOkEnvelope } from '../shared/api-ok-envelope.decorator';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { CardService } from 'src/core/card/card.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SET_CARD_SORTS, SET_SORTS } from 'src/core/query/sort-options.enum';
import { SetService } from 'src/core/set/set.service';
import { Set } from 'src/core/set/set.entity';
import {
    ApiResponseDto,
    BlockPaginationMeta,
    PaginationMeta,
} from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { completionRate } from 'src/http/base/http.util';
import { SetApiResponseDto, SetPriceHistoryPointDto } from './dto/set-response.dto';
import { SetApiPresenter } from './set-api.presenter';
import { CardApiResponseDto } from '../card/dto/card-response.dto';
import { CardApiPresenter } from '../card/card-api.presenter';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { OptionalAuthOrApiKeyGuard } from 'src/http/api/shared/optional-auth-or-api-key.guard';
import { QueryValidationErrorDto } from '../shared/dto/query-validation-error.dto';
import {
    FORMAT_VALUES,
    LEGALITY_VALUES,
    RARITY_VALUES,
    validateApiQuery,
} from '../shared/query-validation';
import { formatUtcDate } from 'src/http/base/date.util';
import { parseDaysParam } from 'src/http/base/query.util';

@ApiTags('Sets')
@Controller('api/v1/sets')
@UseGuards(OptionalAuthOrApiKeyGuard, ApiRateLimitGuard)
export class SetApiController {
    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
    ) {}

    @Get()
    @ApiOperation({ operationId: 'listSets', summary: 'List sets' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'sort', required: false, type: String })
    @ApiQuery({ name: 'ascend', required: false, type: Boolean })
    @ApiQuery({ name: 'filter', required: false, type: String, description: 'Filter sets by name' })
    @ApiQuery({
        name: 'baseOnly',
        required: false,
        type: Boolean,
        description: 'Show only base/main sets',
    })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @ApiQuery({
        name: 'group',
        required: false,
        type: String,
        description: 'Grouping mode: "block" for block-level pagination',
    })
    @ApiOkEnvelope(SetApiResponseDto, { isArray: true, description: 'List of sets' })
    @ApiResponse({
        status: 400,
        description: 'Invalid sort value',
        type: QueryValidationErrorDto,
    })
    async findAll(
        @Req() req: AuthenticatedRequest,
        @Query() query: Record<string, string>
    ): Promise<ApiResponseDto<SetApiResponseDto[]>> {
        validateApiQuery(query, { sort: SET_SORTS });
        const options = new SafeQueryOptions(query).withSetTypes(
            req.user?.includedSetTypes ?? null
        );
        const searchTerm = query.q;
        const useBlockGrouping = query.group === 'block' && !searchTerm && !options.sort;

        let sets: Set[];
        let meta: PaginationMeta;

        if (searchTerm) {
            let total: number;
            [sets, total] = await Promise.all([
                this.setService.searchSets(searchTerm, options),
                this.setService.totalSearchSets(searchTerm),
            ]);
            meta = new PaginationMeta(options.page, options.limit, total);
        } else if (useBlockGrouping) {
            const [totalGroups, blockKeys] = await Promise.all([
                this.setService.totalBlockGroups(options),
                this.setService.findBlockGroupKeys(options),
            ]);
            const [blockSets, multiSetKeys] = await Promise.all([
                this.setService.findSetsByBlockKeys(blockKeys, options),
                this.setService.findMultiSetBlockKeys(blockKeys),
            ]);
            sets = blockSets;
            meta = new BlockPaginationMeta(options.page, options.limit, totalGroups, multiSetKeys);
        } else {
            let total: number;
            [sets, total] = await Promise.all([
                this.setService.findSets(options),
                this.setService.totalSetsCount(options),
            ]);
            meta = new PaginationMeta(options.page, options.limit, total);
        }

        const userId = req.user?.id;
        let totalsMap = new Map<string, number>();
        let valuesMap = new Map<string, number>();
        let subscribed = false;

        if (userId) {
            const setCodes = sets.map((s) => s.code);
            [totalsMap, valuesMap, subscribed] = await Promise.all([
                this.inventoryService.inventoryTotalsForSets(userId, setCodes),
                this.inventoryService.ownedValuesForSets(userId, setCodes),
                this.subscriptionService.isUserSubscribed(userId),
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
                ...(subscribed
                    ? { completionRate: completionRate(ownedTotal, s.effectiveSize) }
                    : {}),
            };
        });

        return ApiResponseDto.ok(data, meta);
    }

    @Get(':code')
    @ApiOperation({ operationId: 'getSet', summary: 'Get set detail by code' })
    @ApiOkEnvelope(SetApiResponseDto, { description: 'Set detail' })
    @ApiResponse({ status: 404, description: 'Set not found' })
    async findByCode(@Param('code') code: string): Promise<ApiResponseDto<SetApiResponseDto>> {
        const set = await this.setService.findByCode(code);
        if (!set) {
            throw new NotFoundException('Set not found');
        }
        return ApiResponseDto.ok(SetApiPresenter.toSetApiResponse(set));
    }

    @Get(':code/cards')
    @ApiOperation({
        operationId: 'getSetCards',
        summary: 'Get cards in a set with optional filters',
    })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'sort', required: false, type: String })
    @ApiQuery({ name: 'ascend', required: false, type: Boolean })
    @ApiQuery({
        name: 'filter',
        required: false,
        type: String,
        description: 'Filter cards by name',
    })
    @ApiQuery({
        name: 'baseOnly',
        required: false,
        type: Boolean,
        description: 'Show only base set cards',
    })
    @ApiQuery({
        name: 'rarity',
        required: false,
        description: 'Filter by rarity',
        enum: [...RARITY_VALUES],
    })
    @ApiQuery({
        name: 'type',
        required: false,
        type: String,
        description: 'Substring match on card type line',
    })
    @ApiQuery({
        name: 'format',
        required: false,
        description: 'Filter by format legality (defaults legality=legal)',
        enum: [...FORMAT_VALUES],
    })
    @ApiQuery({
        name: 'legality',
        required: false,
        description: 'Legality status; only meaningful with format. Defaults to "legal".',
        enum: [...LEGALITY_VALUES],
    })
    @ApiOkEnvelope(CardApiResponseDto, { isArray: true, description: 'Cards in set' })
    @ApiResponse({
        status: 400,
        description: 'Invalid filter value (unknown rarity/format/legality/sort)',
        type: QueryValidationErrorDto,
    })
    async findCardsInSet(
        @Param('code') code: string,
        @Query() query: Record<string, string>
    ): Promise<ApiResponseDto<CardApiResponseDto[]>> {
        validateApiQuery(query, {
            sort: SET_CARD_SORTS,
            rarity: true,
            format: true,
            legality: true,
        });
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
    @ApiOperation({ operationId: 'getSetPriceHistory', summary: 'Get set price history' })
    @ApiQuery({
        name: 'days',
        required: false,
        type: Number,
        description: 'Number of days of history',
    })
    @ApiOkEnvelope(SetPriceHistoryPointDto, {
        isArray: true,
        description: 'Set price history data',
    })
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
