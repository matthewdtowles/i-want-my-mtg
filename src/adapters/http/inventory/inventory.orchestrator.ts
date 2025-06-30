import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { HttpErrorHandler } from "src/adapters/http/http.error.handler";
import { InventoryRequestDto } from "src/adapters/http/inventory/dto/inventory.request.dto";
import { InventoryResponseDto } from "src/adapters/http/inventory/dto/inventory.response.dto";
import { InventoryViewDto } from "src/adapters/http/inventory/dto/inventory.view.dto";
import { InventoryPresenter } from "src/adapters/http/inventory/inventory.presenter";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";

@Injectable()
export class InventoryOrchestrator {
    private readonly LOGGER: Logger = new Logger(InventoryOrchestrator.name);

    constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) { }

    async findByUser(req: AuthenticatedRequest): Promise<InventoryViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const inventoryItems: Inventory[] = await this.inventoryService.findAllCardsForUser(req.user.id);
            const cards: InventoryResponseDto[] = inventoryItems.map(item =>
                InventoryPresenter.toInventoryResponseDto(item));
            const username: string = req.user.name;
            const totalValue: string = "0.00";
            return new InventoryViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Inventory", url: "/inventory" },
                ],
                cards,
                message: cards ? `Inventory for ${username} found` : `Inventory not found for ${username}`,
                status: cards ? ActionStatus.SUCCESS : ActionStatus.ERROR,
                username,
                totalValue,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findByUser");
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