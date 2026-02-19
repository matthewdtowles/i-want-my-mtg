import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryExportService } from 'src/core/inventory/export/inventory-export.service';
import { InventoryImportService } from 'src/core/inventory/import/inventory-import.service';
import {
    CardImportRow,
    ImportError,
    SetImportRow,
} from 'src/core/inventory/import/inventory-import.types';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { ActionStatus } from 'src/http/base/action-status.enum';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { Toast } from 'src/http/base/toast';
import { completionRate, toDollar } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { BaseOnlyToggleView } from 'src/http/list/base-only-toggle.view';
import { FilterView } from 'src/http/list/filter.view';
import { PaginationView } from 'src/http/list/pagination.view';
import { SortableHeaderView } from 'src/http/list/sortable-header.view';
import { TableHeaderView } from 'src/http/list/table-header.view';
import { TableHeadersRowView } from 'src/http/list/table-headers-row.view';
import { buildToggleConfig } from 'src/http/list/toggle-config';
import { getLogger } from 'src/logger/global-app-logger';
import { ImportResultDto } from './dto/import-result.dto';
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
        @Inject(InventoryExportService) private readonly exportService: InventoryExportService
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
                this.inventoryService.totalInventoryItems(userId, new SafeQueryOptions()),
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
                    new SortableHeaderView(options, SortOptions.OWNED_QUANTITY, ['pl-2']),
                    new SortableHeaderView(options, SortOptions.CARD),
                    new SortableHeaderView(options, SortOptions.CARD_SET),
                    new SortableHeaderView(options, SortOptions.PRICE),
                    new TableHeaderView('', ['pr-2', 'xs-hide']),
                ]),
            });
        } catch (error) {
            this.LOGGER.debug(
                `Error finding inventory for user ${req.user?.id}: ${error?.message}`
            );
            return HttpErrorHandler.toHttpException(error, 'findByUserWithPagination');
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
            return HttpErrorHandler.toHttpException(error, 'getLastPage');
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
            const updatedItems: Inventory[] = await this.inventoryService.save(inputInvItems);
            this.LOGGER.debug(
                `Saved ${updatedItems.length} inventory items for user ${req.user.id}`
            );
            return updatedItems;
        } catch (error) {
            this.LOGGER.debug(`Error saving inventory for user ${req.user?.id}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'save');
        }
    }

    async importCards(rows: CardImportRow[], req: AuthenticatedRequest): Promise<ImportResultDto> {
        this.LOGGER.debug(`importCards for user ${req.user?.id}: ${rows.length} rows.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const result = await this.importService.importCards(rows, req.user.id);
            const errorCsv =
                result.errors.length > 0 ? await this.buildErrorCsv(result.errors) : undefined;
            return new ImportResultDto({ ...result, errorCsv });
        } catch (error) {
            this.LOGGER.debug(`Error importing cards for user ${req.user?.id}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'importCards');
        }
    }

    async importSet(row: SetImportRow, req: AuthenticatedRequest): Promise<ImportResultDto> {
        this.LOGGER.debug(`importSet for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const result = await this.importService.importSet(row, req.user.id);
            const errorCsv =
                result.errors.length > 0 ? await this.buildErrorCsv(result.errors) : undefined;
            return new ImportResultDto({ ...result, errorCsv });
        } catch (error) {
            this.LOGGER.debug(`Error importing set for user ${req.user?.id}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'importSet');
        }
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
            return HttpErrorHandler.toHttpException(error, 'exportInventory');
        }
    }

    private buildErrorCsv(errors: ImportError[]): Promise<string> {
        return new Promise((resolve, reject) => {
            stringify(
                errors.map((e) => ({
                    row: e.row,
                    name: e.name ?? '',
                    set_code: e.set_code ?? '',
                    number: e.number ?? '',
                    quantity: e.quantity ?? '',
                    foil: e.foil ?? '',
                    error: e.error,
                })),
                {
                    header: true,
                    columns: ['row', 'name', 'set_code', 'number', 'quantity', 'foil', 'error'],
                },
                (err, out) => (err ? reject(err) : resolve(out))
            );
        });
    }

    async delete(req: AuthenticatedRequest, cardId: string, isFoil: boolean): Promise<boolean> {
        this.LOGGER.debug(
            `Delete inventory item for user ${req.user?.id}. CardId: ${cardId}, isFoil: ${isFoil}`
        );
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            if (!cardId) throw new BadRequestException('Card ID is required for deletion');
            await this.inventoryService.delete(req.user.id, cardId, isFoil);
            this.LOGGER.debug(
                `Deleted inventory item for user ${req.user.id}, cardId: ${cardId}, isFoil: ${isFoil}`
            );
            return true;
        } catch (error) {
            this.LOGGER.debug(
                `Error deleting inventory item for user ${req.user?.id}, cardId: ${cardId}, isFoil: ${isFoil}: ${error?.message}`
            );
            return HttpErrorHandler.toHttpException(error, 'delete');
        }
    }
}
