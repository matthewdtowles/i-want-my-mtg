import {
    BadRequestException,
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
import { InventoryRequestApiDto } from './dto/inventory-request-api.dto';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { InventoryItemApiDto } from './dto/inventory-response.dto';
import { InventoryQuantityApiDto } from './dto/inventory-quantity.dto';
import { InventoryApiPresenter } from './inventory-api.presenter';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';

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
            items.map((item) => InventoryApiPresenter.toInventoryItem(item)),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    @Get('quantities')
    @ApiOperation({ summary: 'Get inventory quantities for a batch of card IDs' })
    @ApiQuery({ name: 'cardIds', required: true, description: 'Comma-separated card IDs' })
    @ApiResponse({ status: 200, description: 'Inventory quantities by card ID' })
    async getQuantities(
        @Query('cardIds') cardIds: string,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<InventoryQuantityApiDto[]>> {
        const ids = cardIds
            ? [
                  ...new Set(
                      cardIds
                          .split(',')
                          .map((id) => id.trim())
                          .filter(Boolean)
                  ),
              ]
            : [];
        if (ids.length === 0) {
            return ApiResponseDto.ok([]);
        }
        if (ids.length > 200) {
            throw new BadRequestException('Maximum of 200 card IDs allowed per request');
        }
        const items = await this.inventoryService.findByCards(req.user.id, ids);
        return ApiResponseDto.ok(InventoryApiPresenter.toQuantityResponse(items));
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
        return ApiResponseDto.ok(saved.map((item) => InventoryApiPresenter.toInventoryItem(item)));
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
        return ApiResponseDto.ok(saved.map((item) => InventoryApiPresenter.toInventoryItem(item)));
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
}
