import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Patch,
    Post,
    Query,
    Render,
    Req,
    UseGuards,
} from '@nestjs/common';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { InventoryRequestDto } from './dto/inventory.request.dto';
import { InventoryViewDto } from './dto/inventory.view.dto';
import { InventoryOrchestrator } from './inventory.orchestrator';

@Controller('inventory')
export class InventoryController {
    constructor(
        @Inject(InventoryOrchestrator) private readonly inventoryOrchestrator: InventoryOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('inventory')
    async findByUser(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<InventoryViewDto> {
        const options = new SafeQueryOptions(query);
        return await this.inventoryOrchestrator.findByUser(req, options);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() inventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest
    ): Promise<{ success: boolean; data?: { cardId: string; isFoil: boolean; quantity: number }[]; error?: string }> {
        const inventories = await this.inventoryOrchestrator.save(inventoryDtos, req);
        const data = inventories.map((inv) => ({
            cardId: inv.cardId,
            isFoil: inv.isFoil,
            quantity: inv.quantity,
        }));
        return { success: true, data };
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    @HttpCode(HttpStatus.OK)
    async update(
        @Body() inventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest
    ): Promise<{ success: boolean; data?: { cardId: string; isFoil: boolean; quantity: number }[]; error?: string }> {
        const inventories = await this.inventoryOrchestrator.save(inventoryDtos, req);
        const data = inventories.map((inv) => ({
            cardId: inv.cardId,
            isFoil: inv.isFoil,
            quantity: inv.quantity,
        }));
        return { success: true, data };
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    @HttpCode(HttpStatus.OK)
    async delete(
        @Body() body: { cardId: string; isFoil: boolean },
        @Req() req: AuthenticatedRequest
    ): Promise<{ success: boolean; error?: string }> {
        const success = await this.inventoryOrchestrator.delete(req, body.cardId, body.isFoil);
        return { success };
    }
}
