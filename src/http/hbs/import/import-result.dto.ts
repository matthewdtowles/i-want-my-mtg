import { ImportError, ImportFormat, IMPORT_FORMAT_LABELS } from 'src/core/import/import.types';

export class ImportResultDto {
    readonly saved: number;
    readonly deleted: number;
    readonly skipped: number;
    readonly errorCount: number;
    readonly errors: ImportError[];
    readonly errorCsv?: string;
    readonly detectedFormat?: ImportFormat;
    readonly detectedFormatLabel?: string;

    constructor(init: Partial<ImportResultDto>) {
        this.saved = init.saved ?? 0;
        this.deleted = init.deleted ?? 0;
        this.skipped = init.skipped ?? 0;
        this.errors = init.errors ?? [];
        this.errorCount = this.errors.length;
        this.errorCsv = init.errorCsv;
        this.detectedFormat = init.detectedFormat;
        this.detectedFormatLabel = init.detectedFormat
            ? IMPORT_FORMAT_LABELS[init.detectedFormat]
            : undefined;
    }
}
