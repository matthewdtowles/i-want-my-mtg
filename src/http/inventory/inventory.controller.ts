import {
    Body,
    Controller,
    Delete,
    Get, Inject,
    Patch,
    Post,
    Query,
    Render,
    Req, UseGuards
} from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { JwtAuthGuard } from "src/http/auth/jwt.auth.guard";
import { ApiResult, createErrorResult, createSuccessResult } from "src/http/base/api.result";
import { safeAlphaNumeric, sanitizeInt } from "src/core/query/query.util";
import { InventoryRequestDto } from "./dto/inventory.request.dto";
import { InventoryViewDto } from "./dto/inventory.view.dto";
import { InventoryOrchestrator } from "./inventory.orchestrator";


@Controller("inventory")
export class InventoryController {

    private readonly defaultLimit = 25;

    constructor(@Inject(InventoryOrchestrator) private readonly inventoryOrchestrator: InventoryOrchestrator) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("inventory")
    async findByUser(
        @Req() req: AuthenticatedRequest,
        @Query("page") pageRaw?: string,
        @Query("limit") limitRaw?: string,
        @Query("filter") filterRaw?: string,
    ): Promise<InventoryViewDto> {
        const limit = sanitizeInt(limitRaw, this.defaultLimit);
        const filter = safeAlphaNumeric(filterRaw);
        const userId = req.user?.id;
        if (!userId) {
            throw new Error("User ID not found in request");
        }
        const lastPage = await this.inventoryOrchestrator.getLastPage(userId, limit, filter);
        const page = Math.min(sanitizeInt(pageRaw, 1), lastPage);
        return this.inventoryOrchestrator.findByUser(req, page, limit, filter);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(
        @Body() createInventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest,
    ): Promise<ApiResult<Inventory[]>> {
        try {
            const createdItems: Inventory[] = await this.inventoryOrchestrator.save(createInventoryDtos, req);
            return createSuccessResult(createdItems, `Added inventory items`);
        } catch (error) {
            return createErrorResult(`Error adding inventory items: ${error}`);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() updateInventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest,
    ): Promise<ApiResult<Inventory[]>> {
        try {
            const updatedInventory: Inventory[] = await this.inventoryOrchestrator.save(updateInventoryDtos, req);
            return createSuccessResult(updatedInventory, `Updated inventory items`);
        } catch (error) {
            return createErrorResult(`Error updating inventory items: ${error}`);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    async delete(
        @Body('cardId') cardId: string,
        @Body('isFoil') isFoil: boolean,
        @Req() req: AuthenticatedRequest,
    ): Promise<ApiResult<{ cardId: string, isFoil: boolean }>> {
        try {
            await this.inventoryOrchestrator.delete(req, cardId, isFoil);
            return createSuccessResult(
                { cardId, isFoil },
                `Deleted inventory item`
            );
        } catch (error) {
            return createErrorResult(`Error deleting inventory item: ${error}`);
        }
    }
}