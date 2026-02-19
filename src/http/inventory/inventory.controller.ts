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
    Render,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { parse as parseCsv } from 'csv-parse/sync';
import { memoryStorage } from 'multer';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { CardCsvParser } from './parsers/card-csv.parser';
import { SetCsvParser } from './parsers/set-csv.parser';
import { UploadRateLimitGuard } from './guards/upload-rate-limit.guard';
import {
    InventoryApiResponseDto,
    InventoryDeleteResponseDto,
    InventoryItemDto,
} from './dto/inventory.api-response.dto';
import { InventoryRequestDto } from './dto/inventory.request.dto';
import { InventoryViewDto } from './dto/inventory.view.dto';
import { InventoryOrchestrator } from './inventory.orchestrator';
import { Response } from 'express';

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
        const rows = CardCsvParser.parse(file.buffer);
        const result = await this.inventoryOrchestrator.importCards(rows, req);
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

        // Detect truncation: parse at most MAX_SET_ROWS+1 raw records to check if file exceeds the cap.
        const MAX_SET_ROWS = 2000;
        const probe: unknown[] = parseCsv(file.buffer, {
            columns: true,
            skip_empty_lines: true,
            to: MAX_SET_ROWS + 1,
        });
        const truncated = probe.length > MAX_SET_ROWS;

        const rows = SetCsvParser.parse(file.buffer); // capped at MAX_SET_ROWS by parser

        let totalSaved = 0;
        let totalDeleted = 0;
        let totalSkipped = 0;
        const allErrors: Array<{ row: number; error: string }> = [];

        if (truncated) {
            allErrors.push({
                row: MAX_SET_ROWS + 1,
                error: `File exceeds ${MAX_SET_ROWS} row limit; only first ${MAX_SET_ROWS} rows processed`,
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
    ): Promise<InventoryApiResponseDto> {
        const inventories = await this.inventoryOrchestrator.save(inventoryDtos, req);
        return new InventoryApiResponseDto({
            success: true,
            data: inventories.map(
                (inv) =>
                    new InventoryItemDto({
                        cardId: inv.cardId,
                        isFoil: inv.isFoil,
                        quantity: inv.quantity,
                    })
            ),
        });
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    @HttpCode(HttpStatus.OK)
    async update(
        @Body() inventoryDtos: InventoryRequestDto[],
        @Req() req: AuthenticatedRequest
    ): Promise<InventoryApiResponseDto> {
        const inventories = await this.inventoryOrchestrator.save(inventoryDtos, req);
        return new InventoryApiResponseDto({
            success: true,
            data: inventories.map(
                (inv) =>
                    new InventoryItemDto({
                        cardId: inv.cardId,
                        isFoil: inv.isFoil,
                        quantity: inv.quantity,
                    })
            ),
        });
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    @HttpCode(HttpStatus.OK)
    async delete(
        @Body() body: { cardId: string; isFoil: boolean },
        @Req() req: AuthenticatedRequest
    ): Promise<InventoryDeleteResponseDto> {
        const success = await this.inventoryOrchestrator.delete(req, body.cardId, body.isFoil);
        return new InventoryDeleteResponseDto({ success });
    }
}
