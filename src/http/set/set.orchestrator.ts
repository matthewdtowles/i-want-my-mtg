import { Inject, Injectable } from '@nestjs/common';
import { Card } from 'src/core/card/card.entity';
import { CardImgType } from 'src/core/card/card.img.type.enum';
import { CardService } from 'src/core/card/card.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { SetPrice } from 'src/core/set/set-price.entity';
import { Set } from 'src/core/set/set.entity';
import { SetService } from 'src/core/set/set.service';
import { ActionStatus } from 'src/http/base/action-status.enum';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { Breadcrumb } from 'src/http/base/breadcrumb';
import { completionRate, isAuthenticated, toDollar } from 'src/http/base/http.util';
import { CardPresenter } from 'src/http/card/card.presenter';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { InventoryPresenter } from 'src/http/inventory/inventory.presenter';
import { FilterView } from 'src/http/list/filter.view';
import { PaginationView } from 'src/http/list/pagination.view';
import { SortableHeaderView } from 'src/http/list/sortable-header.view';
import { TableHeaderView } from 'src/http/list/table-header.view';
import { TableHeadersRowView } from 'src/http/list/table-headers-row.view';
import { getLogger } from 'src/logger/global-app-logger';
import { BaseOnlyToggleView } from '../list/base-only-toggle.view';
import { SetListViewDto } from './dto/set-list.view.dto';
import { SetMetaResponseDto } from './dto/set-meta.response.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { SetResponseDto } from './dto/set.response.dto';
import { SetViewDto } from './dto/set.view.dto';
import { SetTypeMapper } from './set-type.mapper';

@Injectable()
export class SetOrchestrator {
    private readonly LOGGER = getLogger(SetOrchestrator.name);

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(CardService) private readonly cardService: CardService
    ) {}

    async findSetList(
        req: AuthenticatedRequest,
        breadcrumbs: Breadcrumb[],
        options: SafeQueryOptions
    ): Promise<SetListViewDto> {
        this.LOGGER.debug(`Find list of sets.`);
        try {
            const userId = req.user?.id ?? 0;
            const [sets, totalSets] = await Promise.all([
                this.setService.findSets(options),
                this.setService.totalSetsCount(options),
            ]);
            const baseUrl = '/sets';
            const pagination = new PaginationView(options, baseUrl, totalSets);
            this.LOGGER.debug(`Found ${sets?.length} of ${totalSets} total sets.`);
            const tableHeadersRow = new TableHeadersRowView([
                new SortableHeaderView(options, SortOptions.SET, ['pl-2']),
                new SortableHeaderView(options, SortOptions.SET_BASE_PRICE, ['pl-2']),
            ]);
            const isAuthd = isAuthenticated(req);
            if (isAuthd) {
                tableHeadersRow.headers.push(new TableHeaderView('Owned Value'));
            }
            tableHeadersRow.headers.push(
                new SortableHeaderView(options, SortOptions.RELEASE_DATE, ['xs-hide', 'pr-2'])
            );

            return new SetListViewDto({
                authenticated: isAuthd,
                baseOnlyToggle: new BaseOnlyToggleView(options, baseUrl),
                breadcrumbs,
                message: `Page ${pagination.current} of ${pagination.totalPages}`,
                setList: await this.createSetMetaResponseDtos(userId, sets, options),
                status: ActionStatus.SUCCESS,
                pagination,
                filter: new FilterView(options, baseUrl),
                tableHeadersRow,
            });
        } catch (error) {
            this.LOGGER.debug(`Error finding list of sets: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'findSetListPaginated');
        }
    }

    async findBySetCode(
        req: AuthenticatedRequest,
        setCode: string,
        options: SafeQueryOptions
    ): Promise<SetViewDto> {
        this.LOGGER.debug(`Find set and cards for set ${setCode}.`);
        try {
            const userId = req.user?.id ?? 0;
            const set: Set | null = await this.setService.findByCode(setCode);
            if (!set) {
                throw new Error(`Set with code ${setCode} not found`);
            }
            const cards: Card[] = await this.cardService.findBySet(setCode, options);
            set.cards.push(...cards);
            const setResponse = await this.createSetResponseDto(userId, set, options);
            this.LOGGER.debug(`Found ${set?.cards?.length} cards for set ${set.code}.`);
            const baseUrl = `/sets/${set.code}`;
            const setSize = await this.setService.totalCardsInSet(set.code, options);

            return new SetViewDto({
                authenticated: isAuthenticated(req),
                baseOnlyToggle: new BaseOnlyToggleView(options, baseUrl),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Sets', url: '/sets' },
                    { label: setResponse.name, url: baseUrl },
                ],
                message: setResponse ? `Found set: ${setResponse.name}` : 'Set not found',
                set: setResponse,
                status: setResponse ? ActionStatus.SUCCESS : ActionStatus.ERROR,
                pagination: new PaginationView(options, baseUrl, setSize),
                filter: new FilterView(options, baseUrl),
                tableHeadersRow: new TableHeadersRowView([
                    new TableHeaderView('Owned'),
                    new SortableHeaderView(options, SortOptions.NUMBER),
                    new SortableHeaderView(options, SortOptions.CARD),
                    new TableHeaderView('Mana Cost', ['xs-hide']),
                    new TableHeaderView('Rarity', ['xs-hide']),
                    new SortableHeaderView(options, SortOptions.PRICE, ['xs-hide']),
                    new SortableHeaderView(options, SortOptions.PRICE_FOIL, ['xs-hide', 'pr-2']),
                    new SortableHeaderView(options, SortOptions.PRICE, ['xs-show', 'pr-2']),
                ]),
            });
        } catch (error) {
            this.LOGGER.debug(`Failed to find set ${setCode}: ${error?.message}.`);
            return HttpErrorHandler.toHttpException(error, 'findBySetCodeWithPagination');
        }
    }

    async getLastPage(query: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Fetch last page number for list of all sets pagination.`);
        try {
            const totalSets = await this.setService.totalSetsCount(query);
            const lastPage = Math.max(1, Math.ceil(totalSets / query.limit));
            this.LOGGER.debug(`Last page for list of all sets is ${lastPage}.`);
            return lastPage;
        } catch (error) {
            this.LOGGER.debug(`Error getting last page number: ${error.message}.`);
            return HttpErrorHandler.toHttpException(error, 'getLastPage');
        }
    }

    async getLastCardPage(setCode: string, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Fetch last page number for cards in set ${setCode}.`);
        try {
            const totalCards = await this.setService.totalCardsInSet(setCode, options);
            const lastPage = Math.max(1, Math.ceil(totalCards / options.limit));
            this.LOGGER.debug(`Last page for cards in set ${setCode} is ${lastPage}.`);
            return lastPage;
        } catch (error) {
            this.LOGGER.debug(
                `Error getting last page number for cards in set ${setCode}: ${error.message}.`
            );
            return HttpErrorHandler.toHttpException(error, 'getLastCardPage');
        }
    }

    async getSetValue(
        setCode: string,
        includeFoil: boolean,
        options: SafeQueryOptions
    ): Promise<number> {
        const setType = options.baseOnly ? 'main' : 'all';
        const withFoils = includeFoil ? 'with foils' : '';
        this.LOGGER.debug(`Get value for ${setType} set ${setCode} ${withFoils}`);
        try {
            const setValue = await this.setService.totalValueForSet(setCode, includeFoil, options);
            this.LOGGER.debug(`Value for ${setType} set ${setCode} ${withFoils}: ${setValue}.`);
            return setValue;
        } catch (error) {
            this.LOGGER.debug(
                `Error getting set ${setCode} ${includeFoil} value: ${error?.message}.`
            );
            return HttpErrorHandler.toHttpException(error, 'getSetValue');
        }
    }

    /**
     * Creates a SetPriceDto with proper price filtering and deduplication.
     * Handles prices that may be strings or numbers from the database.
     * Filters out zero values and duplicate prices across categories.
     */
    createSetPriceDto(prices: SetPrice): SetPriceDto {
        prices = prices ?? new SetPrice({});

        // Helper to safely convert to number and check if valid price
        const toValidNumber = (value: any): number | null => {
            if (value === null || value === undefined) return null;
            const num = typeof value === 'string' ? parseFloat(value) : Number(value);
            return !isNaN(num) && num > 0 ? num : null;
        };

        // Convert all prices to numbers or null
        const basePrice = toValidNumber(prices.basePrice);
        const basePriceAll = toValidNumber(prices.basePriceAll);
        const totalPrice = toValidNumber(prices.totalPrice);
        const totalPriceAll = toValidNumber(prices.totalPriceAll);

        let defaultPrice = '-';
        let gridCols = 0;

        // Filter and deduplicate prices in priority order (reverse of display)
        const totalPriceAllFiltered =
            totalPriceAll && totalPriceAll !== totalPrice && totalPriceAll !== basePriceAll
                ? toDollar(totalPriceAll)
                : null;
        if (totalPriceAllFiltered) {
            gridCols++;
            defaultPrice = totalPriceAllFiltered;
        }

        const totalPriceNormalFiltered =
            totalPrice && totalPrice !== basePrice ? toDollar(totalPrice) : null;
        if (totalPriceNormalFiltered) {
            gridCols++;
            defaultPrice = totalPriceNormalFiltered;
        }

        const basePriceAllFiltered =
            basePriceAll && basePriceAll !== basePrice ? toDollar(basePriceAll) : null;
        if (basePriceAllFiltered) {
            gridCols++;
            defaultPrice = basePriceAllFiltered;
        }

        const basePriceNormalFiltered = basePrice ? toDollar(basePrice) : null;
        if (basePriceNormalFiltered) {
            gridCols++;
            defaultPrice = basePriceNormalFiltered;
        }

        return new SetPriceDto({
            gridCols,
            defaultPrice,
            basePriceNormal: basePriceNormalFiltered,
            basePriceAll: basePriceAllFiltered,
            totalPriceNormal: totalPriceNormalFiltered,
            totalPriceAll: totalPriceAllFiltered,
            lastUpdate: prices.lastUpdate,
        });
    }

    private async createSetMetaResponseDtos(
        userId: number,
        sets: Set[],
        options: SafeQueryOptions
    ): Promise<SetMetaResponseDto[]> {
        return Promise.all(sets.map((set) => this.createSetMetaResponseDto(userId, set, options)));
    }

    private async createSetMetaResponseDto(
        userId: number,
        set: Set,
        options: SafeQueryOptions
    ): Promise<SetMetaResponseDto> {
        const ownedTotal = await this.inventoryService.totalInventoryItemsForSet(userId, set.code);
        const setSize = await this.setService.totalCardsInSet(set.code, options);
        return new SetMetaResponseDto({
            block: set.block ?? set.name,
            code: set.code,
            completionRate: completionRate(ownedTotal, setSize),
            keyruneCode: set.keyruneCode ?? set.code,
            name: set.name,
            ownedValue: toDollar(await this.inventoryService.ownedValueForSet(userId, set.code)),
            ownedTotal,
            prices: this.createSetPriceDto(set.prices),
            releaseDate: set.releaseDate,
            tags: SetTypeMapper.mapSetTypeToTags(set),
            url: `/sets/${set.code.toLowerCase()}`,
        });
    }

    private async createSetResponseDto(
        userId: number,
        set: Set,
        options: SafeQueryOptions
    ): Promise<SetResponseDto> {
        const setPayloadSize = set.cards?.length || 0;
        const inventory =
            userId && setPayloadSize > 0
                ? await this.inventoryService.findByCards(
                      userId,
                      set.cards.map((c) => c.id)
                  )
                : [];
        const ownedTotal = await this.inventoryService.totalInventoryItemsForSet(userId, set.code);
        const setSize = await this.setService.totalCardsInSet(set.code, options);
        return new SetResponseDto({
            baseSize: set.baseSize,
            block: set.block ?? set.name,
            code: set.code,
            completionRate: completionRate(ownedTotal, setSize),
            keyruneCode: set.keyruneCode ?? set.code,
            name: set.name,
            ownedValue: toDollar(await this.inventoryService.ownedValueForSet(userId, set.code)),
            ownedTotal,
            prices: this.createSetPriceDto(set.prices),
            releaseDate: set.releaseDate,
            tags: SetTypeMapper.mapSetTypeToTags(set),
            totalSize: set.totalSize,
            url: `/sets/${set.code.toLowerCase()}`,
            cards: set.cards
                ? set.cards.map((card) =>
                      CardPresenter.toCardResponse(
                          card,
                          InventoryPresenter.toQuantityMap(inventory)?.get(card.id),
                          CardImgType.SMALL
                      )
                  )
                : [],
        });
    }
}
