import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Header,
    HttpCode,
    HttpStatus,
    Inject,
    Patch,
    Post,
    Query,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiProduces,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { InventoryExportService } from 'src/core/inventory/export/inventory-export.service';
import { InventoryImportService } from 'src/core/inventory/import/inventory-import.service';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { parseCardImport } from 'src/core/import/parsers/card-import-dispatch';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { JwtOrApiKeyGuard } from 'src/http/api/shared/jwt-or-api-key.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { csvUploadInterceptor } from 'src/http/base/csv-upload.interceptor';
import { InventoryRequestApiDto } from './dto/inventory-request-api.dto';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { InventoryItemApiDto } from './dto/inventory-response.dto';
import { InventoryImportResponseDto } from './dto/inventory-import-response.dto';
import { InventoryQuantityApiDto } from './dto/inventory-quantity.dto';
import { InventoryApiPresenter } from './inventory-api.presenter';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { QueryValidationErrorDto } from '../shared/dto/query-validation-error.dto';
import { validateApiQuery } from '../shared/query-validation';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('api/v1/inventory')
@UseGuards(JwtOrApiKeyGuard, ApiRateLimitGuard)
export class InventoryApiController {
    constructor(
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(InventoryImportService) private readonly importService: InventoryImportService,
        @Inject(InventoryExportService) private readonly exportService: InventoryExportService
    ) {}

    @Get()
    @ApiOperation({ summary: 'List inventory items' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'ascend', required: false })
    @ApiQuery({ name: 'filter', required: false })
    @ApiResponse({ status: 200, description: 'Inventory list' })
    @ApiResponse({
        status: 400,
        description: 'Invalid sort value',
        type: QueryValidationErrorDto,
    })
    async findAll(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<InventoryItemApiDto[]>> {
        validateApiQuery(query, { sort: true });
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

    @Post('import/cards')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(csvUploadInterceptor)
    @ApiOperation({
        operationId: 'importInventoryCards',
        summary: 'Import inventory cards from CSV',
        description:
            'Upload a CSV of inventory rows. Auto-detects native IWMM, Moxfield, ' +
            'Archidekt, Deckbox, or TCGPlayer (app + seller) formats. ' +
            'Returns counts of saved/deleted/skipped rows and per-row errors.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary', description: 'CSV file (max 2 MB)' },
            },
            required: ['file'],
        },
    })
    @ApiResponse({ status: 200, description: 'Import result', type: InventoryImportResponseDto })
    @ApiResponse({ status: 400, description: 'Missing or invalid CSV file' })
    async importCards(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<InventoryImportResponseDto>> {
        if (!file) {
            throw new BadRequestException('No CSV file provided or file type not accepted');
        }
        let format: ReturnType<typeof parseCardImport>['format'];
        let rows: ReturnType<typeof parseCardImport>['rows'];
        try {
            ({ format, rows } = parseCardImport(file.buffer));
        } catch (err) {
            throw new BadRequestException(
                err instanceof Error ? err.message : 'Invalid CSV file'
            );
        }
        const result = await this.importService.importCards(rows, req.user.id);
        return ApiResponseDto.ok(
            new InventoryImportResponseDto({
                saved: result.saved,
                deleted: result.deleted,
                skipped: result.skipped,
                errors: result.errors,
                detectedFormat: format,
            })
        );
    }

    @Get('export')
    @ApiOperation({
        operationId: 'exportInventory',
        summary: 'Export inventory as CSV',
        description:
            'Returns the authenticated user\'s full inventory as CSV ' +
            '(columns: id, name, set_code, number, quantity, foil). ' +
            'Reimport-compatible with POST /api/v1/inventory/import/cards.',
    })
    @ApiProduces('text/csv')
    @ApiResponse({ status: 200, description: 'CSV body' })
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="inventory.csv"')
    async exportInventory(
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        const csv = await this.exportService.exportToCsv(req.user.id);
        res.send(csv);
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
