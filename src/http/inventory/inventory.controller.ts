import {
    Body,
    Controller,
    Delete,
    Get, Inject, Param, ParseIntPipe, Patch,
    Post,
    Render,
    Req, UseGuards
} from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { ApiResult, createErrorResult, createSuccessResult } from "src/http/api.result";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { InventoryRequestDto } from "src/http/inventory/dto/inventory.request.dto";
import { InventoryViewDto } from "src/http/inventory/dto/inventory.view.dto";
import { InventoryOrchestrator } from "src/http/inventory/inventory.orchestrator";
import { JwtAuthGuard } from "../auth/jwt.auth.guard";


@Controller("inventory")
export class InventoryController {

    private readonly defaultLimit = 20;

    constructor(@Inject(InventoryOrchestrator) private readonly inventoryOrchestrator: InventoryOrchestrator) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("inventory")
    async findByUser(@Req() req: AuthenticatedRequest): Promise<InventoryViewDto> {
        return this.inventoryOrchestrator.findByUser(req, 1, this.defaultLimit);
    }

    @UseGuards(JwtAuthGuard)
    @Get("page/:page")
    @Render("inventory")
    async findByUserPage(
        @Req() req: AuthenticatedRequest,
        @Param("page", ParseIntPipe) page: number,
    ): Promise<InventoryViewDto> {
        return this.inventoryOrchestrator.findByUser(req, page, this.defaultLimit);
    }

    @UseGuards(JwtAuthGuard)
    @Get("page/:page/limit/:limit")
    @Render("inventory")
    async findByUserPageWithLimit(
        @Req() req: AuthenticatedRequest,
        @Param("page", ParseIntPipe) page: number,
        @Param("limit", ParseIntPipe) limit: number,
    ): Promise<InventoryViewDto> {
        return this.inventoryOrchestrator.findByUser(req, page, limit);
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
        // TODO: define type?
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