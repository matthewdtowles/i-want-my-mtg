import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportError, ImportFormat } from 'src/core/import/import.types';

export class InventoryImportResponseDto {
    @ApiProperty({ description: 'Number of inventory rows saved (created or updated to exact qty)' })
    readonly saved: number;

    @ApiProperty({ description: 'Number of inventory rows deleted (qty=0 in input)' })
    readonly deleted: number;

    @ApiProperty({ description: 'Number of rows skipped because a record already existed (no-qty input)' })
    readonly skipped: number;

    @ApiProperty({ description: 'Total number of row errors' })
    readonly errorCount: number;

    @ApiProperty({
        description: 'Per-row errors. Each entry includes the 1-indexed CSV row and a message.',
        isArray: true,
    })
    readonly errors: ImportError[];

    @ApiPropertyOptional({
        description: 'Auto-detected source format of the uploaded CSV',
        enum: ['native', 'archidekt', 'moxfield', 'deckbox', 'tcgplayer'],
    })
    readonly detectedFormat?: ImportFormat;

    constructor(init: {
        saved: number;
        deleted: number;
        skipped: number;
        errors: ImportError[];
        detectedFormat?: ImportFormat;
    }) {
        this.saved = init.saved;
        this.deleted = init.deleted;
        this.skipped = init.skipped;
        this.errors = init.errors;
        this.errorCount = init.errors.length;
        this.detectedFormat = init.detectedFormat;
    }
}
