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
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { InventoryRequestApiDto } from '../dto/inventory-request-api.dto';
import { ApiResponseDto, PaginationMeta } from '../dto/api-response.dto';
import { InventoryItemApiDto } from '../dto/inventory-response.dto';
import { ApiRateLimitGuard } from '../guards/api-rate-limit.guard';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('api/v1/inventory')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
export class InventoryApiController {
    constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) {}

    @Get()
    @ApiOperation({ summary: 'List inventory items' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'ascend', required: false })
    @ApiQuery({ name: 'filter', required: false })
    @ApiResponse({ status: 200, description: 'Inventory list' })
    async findAll(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<InventoryItemApiDto[]>> {
        const options = new SafeQueryOptions(query);
        const [items, total] = await Promise.all([
            this.inventoryService.findAllForUser(req.user.id, options),
            this.inventoryService.totalInventoryItems(req.user.id, options),
        ]);

        return ApiResponseDto.ok(
            items.map((item) => this.toInventoryItem(item)),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add inventory items' })
    @ApiResponse({ status: 201, description: 'Items added' })
    async create(
        @Body() dtos: InventoryRequestApiDto[],
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<InventoryItemApiDto[]>> {
        const items = dtos.map(
            (dto) =>
                new Inventory({
                    cardId: dto.cardId,
                    userId: req.user.id,
                    isFoil: dto.isFoil,
                    quantity: dto.quantity,
                })
        );
        const saved = await this.inventoryService.save(items);
        return ApiResponseDto.ok(saved.map((item) => this.toInventoryItem(item)));
    }

    @Patch()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update inventory items' })
    @ApiResponse({ status: 200, description: 'Items updated' })
    async update(
        @Body() dtos: InventoryRequestApiDto[],
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<InventoryItemApiDto[]>> {
        const items = dtos.map(
            (dto) =>
                new Inventory({
                    cardId: dto.cardId,
                    userId: req.user.id,
                    isFoil: dto.isFoil,
                    quantity: dto.quantity,
                })
        );
        const saved = await this.inventoryService.save(items);
        return ApiResponseDto.ok(saved.map((item) => this.toInventoryItem(item)));
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete inventory item' })
    @ApiResponse({ status: 200, description: 'Item deleted' })
    async delete(
        @Body() body: { cardId: string; isFoil: boolean },
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        const success = await this.inventoryService.delete(req.user.id, body.cardId, body.isFoil);
        return ApiResponseDto.ok({ deleted: success });
    }

    private toInventoryItem(item: Inventory): InventoryItemApiDto {
        return {
            cardId: item.cardId,
            quantity: item.quantity,
            isFoil: item.isFoil,
            cardName: item.card?.name,
            setCode: item.card?.setCode,
            cardNumber: item.card?.number,
        };
    }
}
