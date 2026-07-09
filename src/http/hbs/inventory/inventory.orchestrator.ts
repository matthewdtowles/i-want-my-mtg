import {
    BadRequestException,
    HttpException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { buildImportErrorCsv } from 'src/core/import/import-error-csv';
import { ImportFormat } from 'src/core/import/import.types';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryExportService } from 'src/core/inventory/export/inventory-export.service';
import { InventoryImportService } from 'src/core/inventory/import/inventory-import.service';
import { CardImportRow, SetImportRow } from 'src/core/inventory/import/inventory-import.types';
import { InventoryKey, InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { SetService } from 'src/core/set/set.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { ActionStatus } from 'src/http/base/action-status.enum';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { Toast } from 'src/http/base/toast';
import { completionRate, toDollar } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { BaseOnlyToggleView } from 'src/http/hbs/list/base-only-toggle.view';
import { FilterView } from 'src/http/hbs/list/filter.view';
import { PaginationView } from 'src/http/hbs/list/pagination.view';
import { inventorySortHeader } from 'src/http/hbs/list/sortable-header.view';
import { TableHeaderView } from 'src/http/hbs/list/table-header.view';
import { TableHeadersRowView } from 'src/http/hbs/list/table-headers-row.view';
import { buildToggleConfig } from 'src/http/hbs/list/toggle-config';
import { getLogger } from 'src/logger/global-app-logger';
import { ImportResultDto } from 'src/http/hbs/import/import-result.dto';
import { InventoryBinderViewDto } from './dto/inventory-binder.view.dto';
import { InventorySellViewDto } from './dto/inventory-sell.view.dto';
import { InventoryRequestDto } from './dto/inventory.request.dto';
import { InventoryResponseDto } from './dto/inventory.response.dto';
import { InventoryViewDto } from './dto/inventory.view.dto';
import { InventoryPresenter } from './inventory.presenter';

@Injectable()
export class InventoryOrchestrator {
    private readonly LOGGER = getLogger(InventoryOrchestrator.name);

    constructor(
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(InventoryImportService) private readonly importService: InventoryImportService,
        @Inject(InventoryExportService) private readonly exportService: InventoryExportService,
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        @Inject(SetService) private readonly setService: SetService
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async findByUser(
        req: AuthenticatedRequest,
        options: SafeQueryOptions
    ): Promise<InventoryViewDto> {
        const userId = req.user?.id;
        this.LOGGER.debug(`Find inventory for user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);

            const [
                inventoryItems,
                currentCount,
                targetCount,
                totalCards,
                ownedValue,
                unfilteredCount,
            ] = await Promise.all([
                this.inventoryService.findAllForUser(req.user.id, options),
                this.inventoryService.totalInventoryItems(userId, options),
                this.inventoryService.totalInventoryItems(
                    userId,
                    options.withBaseOnly(!options.baseOnly)
                ),
                this.inventoryService.totalCards(),
                this.inventoryService.totalOwnedValue(userId),
                this.inventoryService.totalInventoryItems(
                    userId,
                    new SafeQueryOptions({ baseOnly: 'false' })
                ),
            ]);

            const cards: InventoryResponseDto[] = inventoryItems.map((item) =>
                InventoryPresenter.toInventoryResponseDto(item)
            );

            const toggleConfig = buildToggleConfig(options, currentCount, targetCount);
            const baseUrl = '/inventory';

            this.LOGGER.debug(`Found ${cards.length} inventory items for user ${userId}.`);

            return new InventoryViewDto({
                authenticated: req.isAuthenticated(),
                baseOnlyToggle: new BaseOnlyToggleView(
                    options,
                    baseUrl,
                    toggleConfig.targetMaxPage,
                    toggleConfig.visible
                ),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Inventory', url: baseUrl },
                ],
                cards,
                toast: cards
                    ? undefined
                    : new Toast(`Inventory not found for ${req.user.name}`, ActionStatus.ERROR),
                username: req.user.name,
                ownedValue: toDollar(ownedValue),
                ownedTotal: currentCount,
                completionRate: completionRate(currentCount, totalCards),
                hasInventory: unfilteredCount > 0,
                pagination: new PaginationView(options, baseUrl, currentCount),
                filter: new FilterView(options, baseUrl),
                tableHeadersRow: new TableHeadersRowView([
                    inventorySortHeader(options, SortOptions.OWNED_QUANTITY, ['pl-2']),
                    inventorySortHeader(options, SortOptions.CARD),
                    inventorySortHeader(options, SortOptions.CARD_SET),
                    inventorySortHeader(options, SortOptions.PRICE),
                    new TableHeaderView('', ['pr-2', 'xs-hide']),
                ]),
            });
        } catch (error) {
            this.LOGGER.debug(
                `Error finding inventory for user ${req.user?.id}: ${error?.message}`
            );
            HttpErrorHandler.toHttpException(error, 'findByUserWithPagination');
        }
    }

    async getLastPage(userId: number, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Find last page for inventory pagination for user ${userId}.`);
        try {
            const totalItems: number = await this.inventoryService.totalInventoryItems(
                userId,
                options
            );
            const lastPage = Math.max(1, Math.ceil(totalItems / options.limit));
            this.LOGGER.debug(`Last page for user ${userId}: ${lastPage}`);
            return lastPage;
        } catch (error) {
            this.LOGGER.debug(`Error finding last page for user ${userId}: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'getLastPage');
        }
    }

    async save(
        updateInventoryDtos: InventoryRequestDto[],
        req: AuthenticatedRequest
    ): Promise<Inventory[]> {
        this.LOGGER.debug(
            `Save inventory items for user ${req.user?.id}. Count: ${updateInventoryDtos?.length ?? 0}`
        );
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const inputInvItems: Inventory[] = InventoryPresenter.toEntities(
                updateInventoryDtos,
                req.user.id
            );

            // Validate against transaction-derived quantities before saving.
            // De-duplicate by (cardId, isFoil) and fetch remaining quantities in parallel.
            const uniqueKeys = new Map<string, { cardId: string; isFoil: boolean }>();
            for (const item of inputInvItems) {
                const key = `${item.cardId}:${item.isFoil}`;
                if (!uniqueKeys.has(key)) {
                    uniqueKeys.set(key, { cardId: item.cardId, isFoil: item.isFoil });
                }
            }

            const remainingEntries = await Promise.all(
                [...uniqueKeys.entries()].map(async ([key, { cardId, isFoil }]) => {
                    const qty = await this.transactionService.getRemainingQuantity(
                        req.user.id,
                        cardId,
                        isFoil
                    );
                    return [key, qty] as const;
                })
            );
            const remainingByKey = new Map(remainingEntries);

            for (const item of inputInvItems) {
                const minQty = remainingByKey.get(`${item.cardId}:${item.isFoil}`) ?? 0;
                if (item.quantity > 0 && item.quantity < minQty) {
                    throw new BadRequestException(
                        `Cannot set inventory to ${item.quantity}. ` +
                            `${minQty} units are accounted for in transactions. ` +
                            `Record a SELL transaction to reduce below this amount.`
                    );
                }
                if (item.quantity <= 0 && minQty > 0) {
                    throw new BadRequestException(
                        `Cannot remove inventory. ` +
                            `${minQty} units are accounted for in transactions. ` +
                            `Record a SELL transaction to reduce below this amount.`
                    );
                }
            }

            const updatedItems: Inventory[] = await this.inventoryService.save(inputInvItems);
            this.LOGGER.debug(
                `Saved ${updatedItems.length} inventory items for user ${req.user.id}`
            );
            return updatedItems;
        } catch (error) {
            this.LOGGER.debug(`Error saving inventory for user ${req.user?.id}: ${error?.message}`);
            if (error instanceof HttpException) throw error;
            HttpErrorHandler.toHttpException(error, 'save');
        }
    }

    async importCards(
        rows: CardImportRow[],
        req: AuthenticatedRequest,
        detectedFormat?: ImportFormat
    ): Promise<ImportResultDto> {
        this.LOGGER.debug(`importCards for user ${req.user?.id}: ${rows.length} rows.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const result = await this.importService.importCards(rows, req.user.id);
            const errorCsv =
                result.errors.length > 0
                    ? await buildImportErrorCsv(result.errors, [
                          'row',
                          'name',
                          'set_code',
                          'number',
                          'quantity',
                          'foil',
                          'error',
                      ])
                    : undefined;
            return new ImportResultDto({ ...result, errorCsv, detectedFormat });
        } catch (error) {
            this.LOGGER.debug(`Error importing cards for user ${req.user?.id}: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'importCards');
        }
    }

    async importSet(row: SetImportRow, req: AuthenticatedRequest): Promise<ImportResultDto> {
        this.LOGGER.debug(`importSet for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const result = await this.importService.importSet(row, req.user.id);
            const errorCsv =
                result.errors.length > 0
                    ? await buildImportErrorCsv(result.errors, [
                          'row',
                          'name',
                          'set_code',
                          'number',
                          'quantity',
                          'foil',
                          'error',
                      ])
                    : undefined;
            return new ImportResultDto({ ...result, errorCsv });
        } catch (error) {
            this.LOGGER.debug(`Error importing set for user ${req.user?.id}: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'importSet');
        }
    }

    /** Market sell value page (6.4): the whole inventory matched against current buylist offers. */
    async sellView(req: AuthenticatedRequest): Promise<InventorySellViewDto> {
        this.LOGGER.debug(`sellView for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const userId = req.user.id;
            const [plan, unfilteredCount] = await Promise.all([
                this.inventoryService.sellPlanForUser(userId),
                this.inventoryService.totalInventoryItems(
                    userId,
                    new SafeQueryOptions({ baseOnly: 'false' })
                ),
            ]);
            return new InventorySellViewDto({
                authenticated: true,
                username: req.user.name,
                title: 'Market Sell Value - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Inventory', url: '/inventory' },
                    { label: 'Market Sell Value', url: '/inventory/sell' },
                ],
                totalSellValue: plan.totalPayout > 0 ? toDollar(plan.totalPayout) : '$0.00',
                itemsWithOffers: plan.itemsWithOffers,
                itemsWithoutOffers: plan.itemsWithoutOffers,
                hasOffers: plan.itemsWithOffers > 0,
                hasInventory: unfilteredCount > 0,
                vendorGroups: InventoryPresenter.toSellVendorGroups(plan),
            });
        } catch (error) {
            this.LOGGER.debug(`Error in sellView for user ${req.user?.id}: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'sellView');
        }
    }

    /**
     * Market sell value CSV (6.4) for the selected items. `rawKeys` is the
     * posted checkbox value(s) (`cardId:n` | `cardId:f`); absent/empty means
     * nothing selected and yields a header-only CSV.
     */
    async exportSellCsv(req: AuthenticatedRequest, rawKeys: unknown): Promise<string> {
        this.LOGGER.debug(`exportSellCsv for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const selection = this.parseSellSelection(rawKeys);
            const plan = await this.inventoryService.sellPlanForUser(req.user.id, selection);
            return await this.exportService.sellPlanToCsv(plan);
        } catch (error) {
            this.LOGGER.debug(
                `Error exporting sell CSV for user ${req.user?.id}: ${error?.message}`
            );
            HttpErrorHandler.toHttpException(error, 'exportSellCsv');
        }
    }

    /** Normalize the posted `keys` field (string | string[] | absent) into inventory keys. */
    private parseSellSelection(rawKeys: unknown): InventoryKey[] {
        const values = Array.isArray(rawKeys) ? rawKeys : rawKeys != null ? [rawKeys] : [];
        const selection: InventoryKey[] = [];
        for (const value of values) {
            if (typeof value !== 'string') continue;
            const sep = value.lastIndexOf(':');
            if (sep <= 0) continue;
            const finish = value.slice(sep + 1);
            if (finish !== 'n' && finish !== 'f') continue;
            selection.push({ cardId: value.slice(0, sep), isFoil: finish === 'f' });
        }
        return selection;
    }

    async exportInventory(req: AuthenticatedRequest): Promise<string> {
        this.LOGGER.debug(`exportInventory for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            return await this.exportService.exportToCsv(req.user.id);
        } catch (error) {
            this.LOGGER.debug(
                `Error exporting inventory for user ${req.user?.id}: ${error?.message}`
            );
            HttpErrorHandler.toHttpException(error, 'exportInventory');
        }
    }

    async delete(req: AuthenticatedRequest, cardId: string, isFoil: boolean): Promise<boolean> {
        this.LOGGER.debug(
            `Delete inventory item for user ${req.user?.id}. CardId: ${cardId}, isFoil: ${isFoil}`
        );
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            if (!cardId) throw new BadRequestException('Card ID is required for deletion');

            // Validate against transaction-derived quantities before deleting
            const minQty = await this.transactionService.getRemainingQuantity(
                req.user.id,
                cardId,
                isFoil
            );
            if (minQty > 0) {
                throw new BadRequestException(
                    `Cannot delete inventory. ` +
                        `${minQty} units are accounted for in transactions. ` +
                        `Record a SELL transaction to reduce below this amount.`
                );
            }

            await this.inventoryService.delete(req.user.id, cardId, isFoil);
            this.LOGGER.debug(
                `Deleted inventory item for user ${req.user.id}, cardId: ${cardId}, isFoil: ${isFoil}`
            );
            return true;
        } catch (error) {
            this.LOGGER.debug(
                `Error deleting inventory item for user ${req.user?.id}, cardId: ${cardId}, isFoil: ${isFoil}: ${error?.message}`
            );
            if (error instanceof HttpException) throw error;
            HttpErrorHandler.toHttpException(error, 'delete');
        }
    }

    async findBinderBySet(
        req: AuthenticatedRequest,
        code: string
    ): Promise<InventoryBinderViewDto> {
        HttpErrorHandler.validateAuthenticatedRequest(req);
        const userId = req.user.id;

        const set = await this.setService.findByCode(code);
        if (!set) {
            throw new NotFoundException(`Set not found: ${code}`);
        }

        const [ownedTotal, ownedValue] = await Promise.all([
            this.inventoryService.totalInventoryItemsForSet(userId, code),
            this.inventoryService.ownedValueForSet(userId, code),
        ]);

        const cardTotal = set.effectiveSize;

        return new InventoryBinderViewDto({
            authenticated: true,
            setCode: set.code,
            setName: set.name,
            ownedTotal,
            cardTotal,
            completionRate: completionRate(ownedTotal, cardTotal),
            ownedValue: toDollar(ownedValue),
            title: `My ${set.name} Binder - I Want My MTG`,
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Inventory', url: '/inventory' },
                { label: set.name, url: `/inventory/sets/${set.code}` },
            ],
        });
    }
}
