import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { FilterView } from "src/http/list/filter.view";
import { PaginationView } from "src/http/list/pagination.view";
import { SortableHeaderView } from "src/http/list/sortable-header.view";
import { TableHeaderView } from "src/http/list/table-header.view";
import { TableHeadersRowView } from "src/http/list/table-headers-row.view";
import { InventoryRequestDto } from "./dto/inventory.request.dto";
import { InventoryResponseDto } from "./dto/inventory.response.dto";
import { InventoryViewDto } from "./dto/inventory.view.dto";
import { InventoryPresenter } from "./inventory.presenter";

@Injectable()
export class InventoryOrchestrator {

    private readonly LOGGER: Logger = new Logger(InventoryOrchestrator.name);

    constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) { }

    async findByUser(req: AuthenticatedRequest, options: SafeQueryOptions): Promise<InventoryViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const inventoryItems: Inventory[] = await this.inventoryService.findAllForUser(req.user.id, options);
            const cards: InventoryResponseDto[] = inventoryItems.map(
                item => InventoryPresenter.toInventoryResponseDto(item)
            );
            const username: string = req.user.name;
            const baseUrl = "/inventory";

            return new InventoryViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Inventory", url: baseUrl },
                ],
                cards,
                message: cards ? `Inventory for ${username} found` : `Inventory not found for ${username}`,
                status: cards ? ActionStatus.SUCCESS : ActionStatus.ERROR,
                username,
                totalValue: "0,00",
                pagination: new PaginationView(
                    options,
                    baseUrl,
                    await this.inventoryService.totalInventoryItemsForUser(req.user.id, options)
                ),
                filter: new FilterView(options, baseUrl),
                tableHeadersRow: new TableHeadersRowView([
                    new SortableHeaderView(options, SortOptions.OWNED_QUANTITY, ["pl-2"]),
                    new SortableHeaderView(options, SortOptions.CARD),
                    new SortableHeaderView(options, SortOptions.SET),
                    new SortableHeaderView(options, SortOptions.PRICE),
                    new TableHeaderView("", ["pr-2", "xs-hide"]),
                ])
            });
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "findByUserWithPagination");
        }
    }

    async getLastPage(userId: number, options: SafeQueryOptions): Promise<number> {
        try {
            const totalItems: number = await this.inventoryService.totalInventoryItemsForUser(userId, options);
            return Math.max(1, Math.ceil(totalItems / options.limit));
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "getLastPage");
        }
    }

    async save(updateInventoryDtos: InventoryRequestDto[], req: AuthenticatedRequest): Promise<Inventory[]> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const inputInvItems: Inventory[] = InventoryPresenter.toEntities(updateInventoryDtos, req.user.id);
            const updatedItems: Inventory[] = await this.inventoryService.save(inputInvItems);
            this.LOGGER.debug(`Saved ${updatedItems.length} inventory items for user ${req.user.id}`);
            return updatedItems;
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "save");
        }
    }

    async delete(req: AuthenticatedRequest, cardId: string, isFoil: boolean): Promise<boolean> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            if (!cardId) throw new BadRequestException("Card ID is required for deletion");
            await this.inventoryService.delete(req.user.id, cardId, isFoil);
            this.LOGGER.debug(`Deleted inventory item for user ${req.user.id}, cardId: ${cardId}, isFoil: ${isFoil}`);
            return true;
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "delete");
        }
    }
}