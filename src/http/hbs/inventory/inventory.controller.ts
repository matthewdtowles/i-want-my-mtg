import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    Patch,
    Post,
    Query,
    Render,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MAX_IMPORT_ROWS } from 'src/core/import/import.constants';
import { parseCardImport } from 'src/core/import/parsers/card-import-dispatch';
import { SetCsvParser } from 'src/core/import/parsers/set-csv.parser';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { UploadRateLimitGuard } from './guards/upload-rate-limit.guard';
import { InventoryRequestDto } from './dto/inventory.request.dto';
import { ImportExportGuideViewDto } from './dto/import-export-guide.view.dto';
import { InventoryBinderViewDto } from './dto/inventory-binder.view.dto';
import { InventoryViewDto } from './dto/inventory.view.dto';
import { InventoryOrchestrator } from './inventory.orchestrator';
import { Response } from 'express';

// `application/octet-stream` is a pragmatic allowance: Safari (and some Windows
// configurations) send that MIME for .csv uploads. The `.csv` extension check
// below is the load-bearing defense against renamed-binary uploads.
const CSV_MIME_TYPES = new Set([
    'text/csv',
    'text/plain',
    'application/csv',
    'application/octet-stream',
]);

const csvUploadInterceptor = FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const validExtension = file.originalname.toLowerCase().endsWith('.csv');
        const validMime = CSV_MIME_TYPES.has(file.mimetype);
        cb(null, validExtension && validMime);
    },
});

@Controller('inventory')
export class InventoryController {
    constructor(
        @Inject(InventoryOrchestrator) private readonly inventoryOrchestrator: InventoryOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('import-export-guide')
    @Render('importExportGuide')
    async importExportGuide(): Promise<ImportExportGuideViewDto> {
        return new ImportExportGuideViewDto({
            authenticated: true,
            title: 'Import & Export Guide',
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Inventory', url: '/inventory' },
                { label: 'Import & Export Guide', url: '/inventory/import-export-guide' },
            ],
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get('sets/:code')
    @Render('inventoryBinder')
    async binderBySet(
        @Param('code') code: string,
        @Req() req: AuthenticatedRequest
    ): Promise<InventoryBinderViewDto> {
        return await this.inventoryOrchestrator.findBinderBySet(req, code);
    }

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
    @Get('export')
    async exportInventory(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        const csv = await this.inventoryOrchestrator.exportInventory(req);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
        res.send(csv);
    }

    @UseGuards(JwtAuthGuard, UploadRateLimitGuard)
    @Post('import/cards')
    @UseInterceptors(csvUploadInterceptor)
    @Render('importResult')
    async importCards(@UploadedFile() file: Express.Multer.File, @Req() req: AuthenticatedRequest) {
        if (!file) {
            throw new BadRequestException('No CSV file provided or file type not accepted');
        }
        const { format, rows } = parseCardImport(file.buffer);
        const result = await this.inventoryOrchestrator.importCards(rows, req, format);
        return { result };
    }

    @UseGuards(JwtAuthGuard, UploadRateLimitGuard)
    @Post('import/sets')
    @UseInterceptors(csvUploadInterceptor)
    @Render('importResult')
    async importSets(@UploadedFile() file: Express.Multer.File, @Req() req: AuthenticatedRequest) {
        if (!file) {
            throw new BadRequestException('No CSV file provided or file type not accepted');
        }

        // Parser yields every row; we walk row-by-row to call the
        // single-row service, so we apply MAX_IMPORT_ROWS + emit the
        // truncation error ourselves rather than inside the service.
        const allRows = SetCsvParser.parse(file.buffer);
        const rows = allRows.slice(0, MAX_IMPORT_ROWS);

        let totalSaved = 0;
        let totalDeleted = 0;
        let totalSkipped = 0;
        const allErrors: Array<{ row: number; error: string }> = [];

        if (allRows.length > MAX_IMPORT_ROWS) {
            allErrors.push({
                row: MAX_IMPORT_ROWS + 2,
                error: `File exceeds ${MAX_IMPORT_ROWS} row limit; only first ${MAX_IMPORT_ROWS} rows processed`,
            });
        }

        // Process rows sequentially to avoid unbounded DB query fan-out.
        // Row numbers are 1-indexed; the header occupies row 1, so data row i → row i + 2.
        for (let i = 0; i < rows.length; i++) {
            const csvRow = i + 2;
            try {
                const r = await this.inventoryOrchestrator.importSet(rows[i], req);
                totalSaved += r.saved;
                totalDeleted += r.deleted;
                totalSkipped += r.skipped;
                // Remap row numbers from the single-row service result to their actual CSV position.
                allErrors.push(...r.errors.map((e) => ({ ...e, row: csvRow })));
            } catch (err) {
                allErrors.push({ row: csvRow, error: (err as Error)?.message ?? 'Unknown error' });
            }
        }

        return {
            result: {
                saved: totalSaved,
                deleted: totalDeleted,
                skipped: totalSkipped,
                errors: allErrors,
                errorCount: allErrors.length,
            },
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() inventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ cardId: string; isFoil: boolean; quantity: number }[]>> {
        const inventories = await this.inventoryOrchestrator.save(inventoryDtos, req);
        return ApiResponseDto.ok(
            inventories.map((inv) => ({
                cardId: inv.cardId,
                isFoil: inv.isFoil,
                quantity: inv.quantity,
            }))
        );
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    @HttpCode(HttpStatus.OK)
    async update(
        @Body() inventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ cardId: string; isFoil: boolean; quantity: number }[]>> {
        const inventories = await this.inventoryOrchestrator.save(inventoryDtos, req);
        return ApiResponseDto.ok(
            inventories.map((inv) => ({
                cardId: inv.cardId,
                isFoil: inv.isFoil,
                quantity: inv.quantity,
            }))
        );
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    @HttpCode(HttpStatus.OK)
    async delete(
        @Body() body: { cardId: string; isFoil: boolean },
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<null>> {
        await this.inventoryOrchestrator.delete(req, body.cardId, body.isFoil);
        return ApiResponseDto.ok(null);
    }
}
