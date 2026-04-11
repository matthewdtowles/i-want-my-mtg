import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SealedProductInventory } from 'src/core/sealed-product/sealed-product-inventory.entity';
import { SealedProductService } from 'src/core/sealed-product/sealed-product.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { parseDaysParam } from 'src/http/base/query.util';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import {
    SealedInventoryDeleteRequestDto,
    SealedInventoryRequestDto,
} from './dto/sealed-inventory-request.dto';
import {
    SealedProductApiResponseDto,
    SealedProductInventoryApiDto,
    SealedProductPriceHistoryPointDto,
} from './dto/sealed-product-response.dto';
import { SealedProductApiPresenter } from './sealed-product-api.presenter';

@ApiTags('Sealed Products')
@Controller('api/v1')
@UseGuards(ApiRateLimitGuard)
export class SealedProductApiController {
    constructor(
        @Inject(SealedProductService) private readonly sealedProductService: SealedProductService
    ) {}

    @Get('sets/:code/sealed-products')
    @ApiOperation({ summary: 'List sealed products for a set' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiResponse({ status: 200, description: 'Sealed products for the set' })
    async findBySet(
        @Param('code') code: string,
        @Query() query: Record<string, string>
    ): Promise<ApiResponseDto<SealedProductApiResponseDto[]>> {
        const options = new SafeQueryOptions(query);
        const [products, total] = await Promise.all([
            this.sealedProductService.findBySetCode(code, options),
            this.sealedProductService.totalBySetCode(code),
        ]);
        return ApiResponseDto.ok(
            products.map(SealedProductApiPresenter.toResponse),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    @Get('sealed-products/:uuid')
    @ApiOperation({ summary: 'Get sealed product detail' })
    @ApiResponse({ status: 200, description: 'Sealed product detail' })
    @ApiResponse({ status: 404, description: 'Not found' })
    async findByUuid(
        @Param('uuid') uuid: string
    ): Promise<ApiResponseDto<SealedProductApiResponseDto>> {
        const product = await this.sealedProductService.findByUuid(uuid);
        if (!product) {
            throw new NotFoundException('Sealed product not found');
        }
        return ApiResponseDto.ok(SealedProductApiPresenter.toResponse(product));
    }

    @Get('sealed-products/:uuid/price-history')
    @ApiOperation({ summary: 'Get sealed product price history' })
    @ApiQuery({ name: 'days', required: false })
    @ApiResponse({ status: 200, description: 'Price history data' })
    async getPriceHistory(
        @Param('uuid') uuid: string,
        @Query('days') days?: string
    ): Promise<ApiResponseDto<SealedProductPriceHistoryPointDto[]>> {
        const validDays = parseDaysParam(days);
        const history = await this.sealedProductService.findPriceHistory(uuid, validDays);
        return ApiResponseDto.ok(history);
    }

    @Get('inventory/sealed')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List sealed product inventory' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiResponse({ status: 200, description: 'Sealed inventory list' })
    async findInventory(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<SealedProductInventoryApiDto[]>> {
        const options = new SafeQueryOptions(query);
        const [items, total] = await Promise.all([
            this.sealedProductService.findInventoryForUser(req.user.id, options),
            this.sealedProductService.totalInventoryForUser(req.user.id),
        ]);
        return ApiResponseDto.ok(
            items.map(SealedProductApiPresenter.toInventoryResponse),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    @Post('inventory/sealed')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add sealed product to inventory' })
    @ApiResponse({ status: 201, description: 'Item added' })
    async addToInventory(
        @Body() dto: SealedInventoryRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<SealedProductInventoryApiDto>> {
        const item = new SealedProductInventory({
            sealedProductUuid: dto.sealedProductUuid,
            userId: req.user.id,
            quantity: dto.quantity,
        });
        const saved = await this.sealedProductService.saveInventory(item);
        return ApiResponseDto.ok(
            saved ? SealedProductApiPresenter.toInventoryResponse(saved) : null
        );
    }

    @Patch('inventory/sealed')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update sealed product inventory quantity' })
    @ApiResponse({ status: 200, description: 'Item updated' })
    async updateInventory(
        @Body() dto: SealedInventoryRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<SealedProductInventoryApiDto>> {
        const item = new SealedProductInventory({
            sealedProductUuid: dto.sealedProductUuid,
            userId: req.user.id,
            quantity: dto.quantity,
        });
        const saved = await this.sealedProductService.saveInventory(item);
        return ApiResponseDto.ok(
            saved ? SealedProductApiPresenter.toInventoryResponse(saved) : null
        );
    }

    @Delete('inventory/sealed')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Remove sealed product from inventory' })
    @ApiResponse({ status: 200, description: 'Item removed' })
    async removeFromInventory(
        @Body() body: SealedInventoryDeleteRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        const deleted = await this.sealedProductService.deleteInventory(
            body.sealedProductUuid,
            req.user.id
        );
        return ApiResponseDto.ok({ deleted });
    }
}
