import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { ActionStatus } from "src/http/action-status.enum";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { InventoryRequestDto } from "src/http/inventory/dto/inventory.request.dto";
import { InventoryResponseDto } from "src/http/inventory/dto/inventory.response.dto";
import { InventoryViewDto } from "src/http/inventory/dto/inventory.view.dto";
import { InventoryPresenter } from "src/http/inventory/inventory.presenter";
import { PaginationDto } from "src/http/pagination.dto";

@Injectable()
export class InventoryOrchestrator {
    private readonly LOGGER: Logger = new Logger(InventoryOrchestrator.name);
    private readonly BASE_URL: string = "/inventory";

    constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) { }

    async findByUser(req: AuthenticatedRequest, page: number, limit: number, filter?: string): Promise<InventoryViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const inventoryItems: Inventory[] = await this.inventoryService.findAllForUser(req.user.id, page, limit, filter);
            const cards: InventoryResponseDto[] = inventoryItems.map(item => InventoryPresenter.toInventoryResponseDto(item));
            const username: string = req.user.name;
            const totalValue: string = "0.00";
            const totalInventoryItems: number = await this.inventoryService.totalInventoryItemsForUser(req.user.id, filter);
            const pagination = new PaginationDto(page, totalInventoryItems, limit, this.BASE_URL);
            return new InventoryViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Inventory", url: this.BASE_URL },
                ],
                cards,
                message: cards ? `Inventory for ${username} found` : `Inventory not found for ${username}`,
                status: cards ? ActionStatus.SUCCESS : ActionStatus.ERROR,
                username,
                totalValue,
                pagination,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findByUserWithPagination");
        }
    }

    async getLastPage(userId: number, limit: number, filter?: string): Promise<number> {
        try {
            const totalItems: number = await this.inventoryService.totalInventoryItemsForUser(userId, filter);
            return Math.max(1, Math.ceil(totalItems / limit));
        } catch (error) {
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
            return HttpErrorHandler.toHttpException(error, "delete");
        }
    }
}