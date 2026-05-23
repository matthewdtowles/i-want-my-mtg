import { parse } from 'csv-parse/sync';
import { TransactionImportRow } from 'src/core/transaction/import/transaction-import.types';

const EXPECTED_HEADERS = new Set([
    'id',
    'name',
    'set_code',
    'number',
    'type',
    'quantity',
    'price_per_unit',
    'foil',
    'date',
    'source',
    'fees',
    'notes',
]);

/**
 * Native IWMM transaction CSV format. Parser does not cap row count —
 * TransactionImportService applies MAX_IMPORT_ROWS so the user sees a
 * single accurate truncation message per file.
 */
export class TransactionCsvParser {
    static parse(csvBuffer: Buffer): TransactionImportRow[] {
        const records: Record<string, string>[] = parse(csvBuffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
        });

        if (records.length === 0) {
            return [];
        }

        const headers = Object.keys(records[0]);
        for (const h of headers) {
            if (!EXPECTED_HEADERS.has(h)) {
                throw new Error(
                    `Unknown column: "${h}". Expected: ${[...EXPECTED_HEADERS].join(', ')}`
                );
            }
        }

        return records.map((rec) => ({
            id: rec.id?.trim() || undefined,
            name: rec.name?.trim() || undefined,
            set_code: rec.set_code?.trim() || undefined,
            number: rec.number?.trim() || undefined,
            type: rec.type?.trim() || undefined,
            quantity: rec.quantity?.trim() || undefined,
            price_per_unit: rec.price_per_unit?.trim() || undefined,
            foil: rec.foil?.trim() || undefined,
            date: rec.date?.trim() || undefined,
            source: rec.source?.trim() || undefined,
            fees: rec.fees?.trim() || undefined,
            notes: rec.notes?.trim() || undefined,
        }));
    }
}
