import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Inject, Patch,
    Post,
    Render,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Response } from "express";
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
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        const createdItems: Inventory[] = await this.inventoryOrchestrator.save(createInventoryDtos, req);
        return res.status(HttpStatus.CREATED).json({
            message: `Added inventory items`,
            inventory: createdItems,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() updateInventoryDtos: InventoryRequestDto[],
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        const updatedInventory: Inventory[] = await this.inventoryOrchestrator.save(updateInventoryDtos, req);
        return res.status(HttpStatus.OK).json({
            message: `Updated inventory`,
            inventory: updatedInventory,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    async delete(
        @Body('cardId') cardId: string,
        @Body('isFoil') isFoil: boolean,
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        await this.inventoryOrchestrator.delete(req, cardId, isFoil);
        return res.status(HttpStatus.OK).json({
            message: `Deleted inventory item`,
            cardId,
        });
    }
}