import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { InventoryRequestDto } from "src/adapters/http/inventory/dto/inventory.request.dto";
import { InventoryResponseDto } from "src/adapters/http/inventory/dto/inventory.response.dto";
import { InventoryViewDto } from "src/adapters/http/inventory/dto/inventory.view.dto";
import { InventoryPresenter } from "src/adapters/http/inventory/inventory.presenter";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";

@Injectable()
export class InventoryOrchestrator {

    constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) { }

    async findByUser(req: AuthenticatedRequest): Promise<InventoryViewDto> {
        this.validateAuthenticatedRequest(req);
        const inventoryItems: Inventory[] = await this.inventoryService.findAllCardsForUser(req.user.id);
        const cards: InventoryResponseDto[] = inventoryItems.map(item => InventoryPresenter.toInventoryResponseDto(item));
        const username = req.user.name;
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
    }

    async save(updateInventoryDtos: InventoryRequestDto[], req: AuthenticatedRequest): Promise<Inventory[]> {
        this.validateAuthenticatedRequest(req);
        const inputInvItems: Inventory[] = InventoryPresenter.toEntities(updateInventoryDtos, req.user.id);
        const updatedItems: Inventory[] = await this.inventoryService.save(inputInvItems);
        return updatedItems;
    }

    async delete(req: AuthenticatedRequest, cardId: string, isFoil: boolean): Promise<boolean> {
        this.validateAuthenticatedRequest(req);
        if (!cardId) throw new BadRequestException("Card ID is required for deletion");
        await this.inventoryService.delete(req.user.id, cardId, isFoil);
        return true;
    }

    private validateAuthenticatedRequest(req: AuthenticatedRequest): void {
        if (!req) throw new NotFoundException("Request not found");
        if (!req.user) throw new NotFoundException("User not found in request");
        if (!req.user.id) throw new NotFoundException("User does not have valid ID");
    }
}