import { Inject, Injectable } from '@nestjs/common';
import { CardImgType } from 'src/core/card/card.img.type.enum';
import { CardService } from 'src/core/card/card.service';
import { InventoryImportService } from 'src/core/inventory/import/inventory-import.service';
import { SetImportRow } from 'src/core/inventory/import/inventory-import.types';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { SetChecklistService } from 'src/core/set/checklist/set-checklist.service';
import { SetPrice } from 'src/core/set/set-price.entity';
import { Set } from 'src/core/set/set.entity';
import { SetService } from 'src/core/set/set.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { Breadcrumb } from 'src/http/base/breadcrumb';
import { completionRate, isAuthenticated, toDollar } from 'src/http/base/http.util';
import { CardPresenter } from 'src/http/hbs/card/card.presenter';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { ImportResultDto } from 'src/http/hbs/inventory/dto/import-result.dto';
import { InventoryPresenter } from 'src/http/hbs/inventory/inventory.presenter';
import { BaseOnlyToggleView } from 'src/http/hbs/list/base-only-toggle.view';
import { FilterView } from 'src/http/hbs/list/filter.view';
import { PaginationView } from 'src/http/hbs/list/pagination.view';
import { SortableHeaderView } from 'src/http/hbs/list/sortable-header.view';
import { TableHeaderView } from 'src/http/hbs/list/table-header.view';
import { TableHeadersRowView } from 'src/http/hbs/list/table-headers-row.view';
import { buildToggleConfig } from 'src/http/hbs/list/toggle-config';
import { getLogger } from 'src/logger/global-app-logger';
import { SetBlockGroup } from './dto/set-block-group.dto';
import {
    SetPriceHistoryPointDto,
    SetPriceHistoryResponseDto,
} from './dto/set-price-history-response.dto';
import { SetListViewDto } from './dto/set-list.view.dto';
import { SetMetaResponseDto } from './dto/set-meta.response.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { SetResponseDto } from './dto/set.response.dto';
import { SetViewDto } from './dto/set.view.dto';
import { SetTypeMapper } from 'src/http/base/set-type.mapper';

@Injectable()
export class SetOrchestrator {
    private readonly LOGGER = getLogger(SetOrchestrator.name);

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryImportService)
        private readonly importService: InventoryImportService,
        @Inject(SetChecklistService) private readonly checklistService: SetChecklistService
    ) {}

    async findSetList(
        req: AuthenticatedRequest,
        breadcrumbs: Breadcrumb[],
        options: SafeQueryOptions
    ): Promise<SetListViewDto> {
        this.LOGGER.debug(`Find list of sets.`);
        try {
            const userId = req.user?.id ?? 0;

            if (options.sort) {
                return await this.findFlatSetList(req, breadcrumbs, options, userId);
            }
            return await this.findBlockSetList(req, breadcrumbs, options, userId);
        } catch (error) {
            this.LOGGER.debug(`Error finding list of sets: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'findSetList');
        }
    }

    private async findFlatSetList(
        req: AuthenticatedRequest,
        breadcrumbs: Breadcrumb[],
        options: SafeQueryOptions,
        userId: number
    ): Promise<SetListViewDto> {
        const [sets, currentCount, targetCount] = await Promise.all([
            this.setService.findSets(options),
            this.setService.totalSetsCount(options),
            this.setService.totalSetsCount(options.withBaseOnly(!options.baseOnly)),
        ]);

        const setDtos = await this.createSetMetaResponseDtos(userId, sets);
        const blockGroups = setDtos.map(
            (dto) =>
                new SetBlockGroup({
                    blockName: dto.block || dto.name,
                    sets: [dto],
                    isMultiSet: false,
                    releaseDate: dto.releaseDate,
                    defaultPrice: dto.prices?.defaultPrice ?? '-',
                })
        );

        const toggleConfig = buildToggleConfig(options, currentCount, targetCount);
        const baseUrl = '/sets';

        return new SetListViewDto({
            authenticated: isAuthenticated(req),
            baseOnlyToggle: new BaseOnlyToggleView(
                options,
                baseUrl,
                toggleConfig.targetMaxPage,
                toggleConfig.visible
            ),
            breadcrumbs,
            setList: setDtos,
            blockGroups,
            pagination: new PaginationView(options, baseUrl, currentCount),
            filter: new FilterView(options, baseUrl),
            tableHeadersRow: this.buildSetListTableHeaders(options, isAuthenticated(req)),
        });
    }

    private async findBlockSetList(
        req: AuthenticatedRequest,
        breadcrumbs: Breadcrumb[],
        options: SafeQueryOptions,
        userId: number
    ): Promise<SetListViewDto> {
        const [totalGroups, targetGroupCount, blockKeys] = await Promise.all([
            this.setService.totalBlockGroups(options),
            this.setService.totalBlockGroups(options.withBaseOnly(!options.baseOnly)),
            this.setService.findBlockGroupKeys(options),
        ]);

        const [sets, multiSetKeys] = await Promise.all([
            this.setService.findSetsByBlockKeys(blockKeys, options),
            this.setService.findMultiSetBlockKeys(blockKeys),
        ]);
        const multiSetKeySet = new globalThis.Set(multiSetKeys);
        const setDtos = await this.createSetMetaResponseDtos(userId, sets);
        const blockGroups = this.groupSetsByBlock(setDtos, multiSetKeySet);
        const sortedGroups = this.sortBlockGroups(blockGroups);

        const toggleConfig = buildToggleConfig(options, totalGroups, targetGroupCount);
        const baseUrl = '/sets';

        return new SetListViewDto({
            authenticated: isAuthenticated(req),
            baseOnlyToggle: new BaseOnlyToggleView(
                options,
                baseUrl,
                toggleConfig.targetMaxPage,
                toggleConfig.visible
            ),
            breadcrumbs,
            setList: setDtos,
            blockGroups: sortedGroups,
            pagination: new PaginationView(options, baseUrl, totalGroups),
            filter: new FilterView(options, baseUrl),
            tableHeadersRow: this.buildSetListTableHeaders(options, isAuthenticated(req)),
        });
    }

    async findSpoilersList(
        req: AuthenticatedRequest,
        breadcrumbs: Breadcrumb[]
    ): Promise<SetListViewDto> {
        this.LOGGER.debug(`Find list of spoiler sets.`);
        try {
            const userId = req.user?.id ?? 0;
            const sets = await this.setService.findSpoilerSets();

            return new SetListViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs,
                setList: await this.createSetMetaResponseDtos(userId, sets),
            });
        } catch (error) {
            this.LOGGER.debug(`Error finding spoiler sets: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'findSpoilersList');
        }
    }

    async findBySetCode(
        req: AuthenticatedRequest,
        setCode: string,
        options: SafeQueryOptions
    ): Promise<SetViewDto> {
        this.LOGGER.debug(`Find set and cards for set ${setCode}.`);
        try {
            const set = await this.setService.findByCode(setCode);
            if (!set) {
                throw new Error(`Set with code ${setCode} not found`);
            }

            const forceShowAll = !set.isMain;
            const effectiveOptions = forceShowAll ? options.withBaseOnly(false) : options;
            const hasFilter = !!effectiveOptions.filter;

            const [cards, currentCount, targetCount] = await Promise.all([
                this.cardService.findBySet(setCode, effectiveOptions),
                hasFilter
                    ? this.cardService.totalInSet(setCode, effectiveOptions)
                    : Promise.resolve(effectiveOptions.baseOnly ? set.baseSize : set.totalSize),
                hasFilter
                    ? this.cardService.totalInSet(
                          setCode,
                          effectiveOptions.withBaseOnly(!effectiveOptions.baseOnly)
                      )
                    : Promise.resolve(effectiveOptions.baseOnly ? set.totalSize : set.baseSize),
            ]);

            const toggleConfig = buildToggleConfig(
                effectiveOptions,
                currentCount,
                targetCount,
                forceShowAll
            );
            set.cards.push(...cards);

            const userId = req.user?.id ?? 0;
            const setResponse = await this.createSetResponseDto(userId, set, effectiveOptions);
            const baseUrl = `/sets/${set.code}`;

            const hasAnyNormalPrice = setResponse.cards?.some((c) => c.normalPriceRaw > 0) ?? false;
            const hasAnyFoilPrice = setResponse.cards?.some((c) => c.foilPriceRaw > 0) ?? false;

            this.LOGGER.debug(`Found ${cards.length} cards for set ${set.code}.`);

            return new SetViewDto({
                authenticated: isAuthenticated(req),
                baseOnlyToggle: new BaseOnlyToggleView(
                    effectiveOptions,
                    baseUrl,
                    toggleConfig.targetMaxPage,
                    toggleConfig.visible
                ),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Sets', url: '/sets' },
                    { label: setResponse.name, url: baseUrl },
                ],
                set: setResponse,
                hasAnyNormalPrice,
                hasAnyFoilPrice,
                pagination: new PaginationView(effectiveOptions, baseUrl, currentCount),
                filter: new FilterView(effectiveOptions, baseUrl),
                tableHeadersRow: this.buildSetDetailTableHeaders(
                    effectiveOptions,
                    hasAnyNormalPrice,
                    hasAnyFoilPrice
                ),
            });
        } catch (error) {
            this.LOGGER.debug(`Failed to find set ${setCode}: ${error?.message}.`);
            return HttpErrorHandler.toHttpException(error, 'findBySetCodeWithPagination');
        }
    }

    async getLastPage(query: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Fetch last page number for list of all sets pagination.`);
        try {
            const total = query.sort
                ? await this.setService.totalSetsCount(query)
                : await this.setService.totalBlockGroups(query);
            const lastPage = Math.max(1, Math.ceil(total / query.limit));
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
            let totalCards: number;
            if (options.filter) {
                totalCards = await this.cardService.totalInSet(setCode, options);
            } else {
                totalCards = await this.setService.totalCardsInSet(setCode, options);
            }
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

    async addSetToInventory(
        req: AuthenticatedRequest,
        setCode: string,
        foil: boolean,
        includeVariants: boolean
    ): Promise<ImportResultDto> {
        this.LOGGER.debug(`addSetToInventory: set ${setCode} for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const row: SetImportRow = {
                set_code: setCode,
                foil: foil ? 'true' : 'false',
                include_variants: includeVariants ? 'true' : 'false',
            };
            const result = await this.importService.importSet(row, req.user.id);
            return new ImportResultDto(result);
        } catch (error) {
            this.LOGGER.debug(
                `Error adding set ${setCode} to inventory for user ${req.user?.id}: ${error?.message}`
            );
            return HttpErrorHandler.toHttpException(error, 'addSetToInventory');
        }
    }

    async getChecklist(setCode: string, userId: number | null): Promise<string> {
        this.LOGGER.debug(`getChecklist for set ${setCode}, user ${userId}.`);
        try {
            return await this.checklistService.generateChecklist(setCode, userId);
        } catch (error) {
            this.LOGGER.debug(`Error generating checklist for set ${setCode}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getChecklist');
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

    async getSetPriceHistory(setCode: string, days?: number): Promise<SetPriceHistoryResponseDto> {
        this.LOGGER.debug(`Get set price history for set ${setCode}, days=${days}.`);
        try {
            const prices = await this.setService.findSetPriceHistory(setCode, days);
            const points: SetPriceHistoryPointDto[] = prices.map((p) => ({
                date:
                    p.date instanceof Date
                        ? `${p.date.getUTCFullYear()}-${String(p.date.getUTCMonth() + 1).padStart(2, '0')}-${String(p.date.getUTCDate()).padStart(2, '0')}`
                        : String(p.date),
                basePrice: p.basePrice != null ? Number(p.basePrice) : null,
                totalPrice: p.totalPrice != null ? Number(p.totalPrice) : null,
                basePriceAll: p.basePriceAll != null ? Number(p.basePriceAll) : null,
                totalPriceAll: p.totalPriceAll != null ? Number(p.totalPriceAll) : null,
            }));
            return { setCode, prices: points };
        } catch (error) {
            this.LOGGER.debug(`Error getting set price history for ${setCode}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getSetPriceHistory');
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
        let defaultChange: number | null = null;
        let gridCols = 0;

        // Helper to convert change value to number or null
        const toChangeNumber = (value: any): number | null => {
            if (value === null || value === undefined) return null;
            const num = typeof value === 'string' ? parseFloat(value) : Number(value);
            return isNaN(num) ? null : num;
        };

        // Filter and deduplicate prices in priority order (reverse of display)
        const totalPriceAllFiltered =
            totalPriceAll && totalPriceAll !== totalPrice && totalPriceAll !== basePriceAll
                ? toDollar(totalPriceAll)
                : null;
        if (totalPriceAllFiltered) {
            gridCols++;
            defaultPrice = totalPriceAllFiltered;
            defaultChange = toChangeNumber(prices.totalPriceAllChangeWeekly);
        }

        const totalPriceNormalFiltered =
            totalPrice && totalPrice !== basePrice ? toDollar(totalPrice) : null;
        if (totalPriceNormalFiltered) {
            gridCols++;
            defaultPrice = totalPriceNormalFiltered;
            defaultChange = toChangeNumber(prices.totalPriceChangeWeekly);
        }

        const basePriceAllFiltered =
            basePriceAll && basePriceAll !== basePrice ? toDollar(basePriceAll) : null;
        if (basePriceAllFiltered) {
            gridCols++;
            defaultPrice = basePriceAllFiltered;
            defaultChange = toChangeNumber(prices.basePriceAllChangeWeekly);
        }

        const basePriceNormalFiltered = basePrice ? toDollar(basePrice) : null;
        if (basePriceNormalFiltered) {
            gridCols++;
            defaultPrice = basePriceNormalFiltered;
            defaultChange = toChangeNumber(prices.basePriceChangeWeekly);
        }

        // Helper to format a change value into display string + sign
        const formatChange = (value: any): { changeWeekly: string; changeWeeklySign: string } => {
            const num = toChangeNumber(value);
            if (num === null) return { changeWeekly: '', changeWeeklySign: '' };
            if (num === 0) return { changeWeekly: '$0.00', changeWeeklySign: 'neutral' };
            const abs = Math.abs(Math.round(num * 100) / 100);
            const formatted = '$' + abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return num > 0
                ? { changeWeekly: `+${formatted}`, changeWeeklySign: 'positive' }
                : { changeWeekly: `-${formatted}`, changeWeeklySign: 'negative' };
        };

        const defaultFormatted = formatChange(defaultChange);
        const basePriceNormalChange = basePriceNormalFiltered
            ? formatChange(prices.basePriceChangeWeekly)
            : { changeWeekly: '', changeWeeklySign: '' };
        const basePriceAllChange = basePriceAllFiltered
            ? formatChange(prices.basePriceAllChangeWeekly)
            : { changeWeekly: '', changeWeeklySign: '' };
        const totalPriceNormalChange = totalPriceNormalFiltered
            ? formatChange(prices.totalPriceChangeWeekly)
            : { changeWeekly: '', changeWeeklySign: '' };
        const totalPriceAllChange = totalPriceAllFiltered
            ? formatChange(prices.totalPriceAllChangeWeekly)
            : { changeWeekly: '', changeWeeklySign: '' };

        return new SetPriceDto({
            gridCols,
            defaultPrice,
            basePriceNormal: basePriceNormalFiltered,
            basePriceAll: basePriceAllFiltered,
            totalPriceNormal: totalPriceNormalFiltered,
            totalPriceAll: totalPriceAllFiltered,
            defaultPriceChangeWeekly: defaultFormatted.changeWeekly,
            defaultPriceChangeWeeklySign: defaultFormatted.changeWeeklySign,
            basePriceNormalChangeWeekly: basePriceNormalChange.changeWeekly,
            basePriceNormalChangeWeeklySign: basePriceNormalChange.changeWeeklySign,
            basePriceAllChangeWeekly: basePriceAllChange.changeWeekly,
            basePriceAllChangeWeeklySign: basePriceAllChange.changeWeeklySign,
            totalPriceNormalChangeWeekly: totalPriceNormalChange.changeWeekly,
            totalPriceNormalChangeWeeklySign: totalPriceNormalChange.changeWeeklySign,
            totalPriceAllChangeWeekly: totalPriceAllChange.changeWeekly,
            totalPriceAllChangeWeeklySign: totalPriceAllChange.changeWeeklySign,
            lastUpdate: prices.lastUpdate,
        });
    }

    groupSetsByBlock(
        sets: SetMetaResponseDto[],
        multiSetKeys: globalThis.Set<string> = new globalThis.Set()
    ): SetBlockGroup[] {
        // Group by parent_code: child sets group under their parent's code,
        // all other sets stand alone under their own code.
        const codeToName = new Map<string, string>();
        for (const set of sets) {
            codeToName.set(set.code, set.block || set.name);
        }

        const blockMap = new Map<string, SetMetaResponseDto[]>();
        for (const set of sets) {
            const groupKey = set.parentCode || set.code;
            if (!blockMap.has(groupKey)) {
                blockMap.set(groupKey, []);
            }
            blockMap.get(groupKey).push(set);
        }

        const groups: SetBlockGroup[] = [];
        for (const [groupKey, blockSets] of blockMap) {
            blockSets.sort((a, b) => {
                // Main sets first, then by release date
                if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
                return a.releaseDate.localeCompare(b.releaseDate);
            });

            const blockName = codeToName.get(groupKey) || blockSets[0].name;
            const earliestDate = blockSets[0].releaseDate;
            const totalPrice = blockSets.reduce((sum, s) => {
                const price = this.parseDollar(s.prices?.defaultPrice);
                return sum + price;
            }, 0);

            groups.push(
                new SetBlockGroup({
                    blockName,
                    sets: blockSets,
                    isMultiSet: blockSets.length > 1 || multiSetKeys.has(groupKey),
                    releaseDate: earliestDate,
                    defaultPrice: totalPrice.toFixed(2),
                })
            );
        }

        return groups;
    }

    sortBlockGroups(groups: SetBlockGroup[]): SetBlockGroup[] {
        // Block view is always sorted by release date DESC (matches DB block ordering)
        return [...groups].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    }

    private parseDollar(value: string | undefined): number {
        if (!value || value === '-') return 0;
        const num = parseFloat(value.replace(/[$,]/g, ''));
        return isNaN(num) ? 0 : num;
    }

    private buildSetListTableHeaders(
        options: SafeQueryOptions,
        authenticated: boolean
    ): TableHeadersRowView {
        const headers = new TableHeadersRowView([
            new SortableHeaderView(options, SortOptions.SET, ['pl-2']),
            new SortableHeaderView(options, SortOptions.SET_BASE_PRICE, ['pl-2'], '7d'),
        ]);
        if (authenticated) {
            headers.headers.push(new TableHeaderView('Owned Value'));
        }
        headers.headers.push(
            new SortableHeaderView(options, SortOptions.RELEASE_DATE, ['xs-hide', 'pr-2'])
        );
        return headers;
    }

    private buildSetDetailTableHeaders(
        options: SafeQueryOptions,
        hasAnyNormalPrice = true,
        hasAnyFoilPrice = true
    ): TableHeadersRowView {
        const headers = [
            new TableHeaderView('Owned'),
            new SortableHeaderView(options, SortOptions.NUMBER),
            new SortableHeaderView(options, SortOptions.CARD),
            new TableHeaderView('Mana Cost', ['xs-hide']),
            new TableHeaderView('Rarity', ['xs-hide']),
        ];
        if (hasAnyNormalPrice) {
            headers.push(new SortableHeaderView(options, SortOptions.PRICE, ['xs-hide'], '7d'));
        }
        if (hasAnyFoilPrice) {
            headers.push(
                new SortableHeaderView(options, SortOptions.PRICE_FOIL, ['xs-hide', 'pr-2'], '7d')
            );
        }
        if (hasAnyNormalPrice || hasAnyFoilPrice) {
            headers.push(
                new SortableHeaderView(options, SortOptions.PRICE, ['xs-show', 'pr-2'], '7d')
            );
        }
        return new TableHeadersRowView(headers);
    }

    private async createSetMetaResponseDtos(
        userId: number,
        sets: Set[]
    ): Promise<SetMetaResponseDto[]> {
        const setCodes = sets.map((s) => s.code);
        let totalsMap = new Map<string, number>();
        let valuesMap = new Map<string, number>();

        if (userId) {
            [totalsMap, valuesMap] = await Promise.all([
                this.inventoryService.inventoryTotalsForSets(userId, setCodes),
                this.inventoryService.ownedValuesForSets(userId, setCodes),
            ]);
        }

        return sets.map((set) => {
            const ownedTotal = totalsMap.get(set.code) ?? 0;
            const ownedValue = valuesMap.get(set.code) ?? 0;

            return new SetMetaResponseDto({
                baseSize: set.baseSize,
                block: set.block ?? set.name,
                code: set.code,
                completionRate: completionRate(ownedTotal, set.effectiveSize),
                isMain: set.isMain,
                keyruneCode: set.keyruneCode ?? set.code,
                name: set.name,
                ownedValue: toDollar(ownedValue),
                ownedTotal,
                parentCode: set.parentCode,
                prices: this.createSetPriceDto(set.prices),
                releaseDate: set.releaseDate,
                tags: SetTypeMapper.mapSetTypeToTags(set),
                totalSize: set.totalSize,
                url: `/sets/${set.code.toLowerCase()}`,
            });
        });
    }

    private async createSetResponseDto(
        userId: number,
        set: Set,
        _options: SafeQueryOptions
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

        const effectiveSize = set.effectiveSize;

        return new SetResponseDto({
            baseSize: set.baseSize,
            block: set.block ?? set.name,
            code: set.code,
            completionRate: completionRate(ownedTotal, effectiveSize),
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
                          CardImgType.NORMAL
                      )
                  )
                : [],
        });
    }
}
