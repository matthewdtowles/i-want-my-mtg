import {
    Body,
    Controller,
    Delete,
    Get, Inject, Patch,
    Post,
    Render,
    Req, UseGuards
} from "@nestjs/common";
import { ApiResult } from "src/adapters/http/api.result";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { InventoryRequestDto } from "src/adapters/http/inventory/dto/inventory.request.dto";
import { InventoryViewDto } from "src/adapters/http/inventory/dto/inventory.view.dto";
import { InventoryOrchestrator } from "src/adapters/http/inventory/inventory.orchestrator";
import { Inventory } from "src/core/inventory/inventory.entity";
import { JwtAuthGuard } from "../auth/jwt.auth.guard";


@Controller("inventory")
export class InventoryController {

    constructor(@Inject(InventoryOrchestrator) private readonly inventoryOrchestrator: InventoryOrchestrator) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("inventory")
    async findByUser(@Req() req: AuthenticatedRequest): Promise<InventoryViewDto> {
        return this.inventoryOrchestrator.findByUser(req);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(
        @Body() createInventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest,
    ): Promise<ApiResult<Inventory[]>> {
        const createdItems: Inventory[] = await this.inventoryOrchestrator.save(createInventoryDtos, req);
        return {
            success: true,
            data: createdItems,
            message: `Added inventory items`,
        };
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() updateInventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest,
    ): Promise<ApiResult<Inventory[]>> {
        const updatedInventory: Inventory[] = await this.inventoryOrchestrator.save(updateInventoryDtos, req);
        return {
            success: true,
            data: updatedInventory,
            message: `Updated inventory`
        };
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    async delete(
        @Body('cardId') cardId: string,
        @Body('isFoil') isFoil: boolean,
        @Req() req: AuthenticatedRequest,
        // TODO: define type?
    ): Promise<ApiResult<{ cardId: string, isFoil: boolean }>> {
        await this.inventoryOrchestrator.delete(req, cardId, isFoil);
        return {
            success: true,
            message: `Deleted inventory item`,
            data: { cardId, isFoil },
        };
    }
}