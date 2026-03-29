import { parse } from 'csv-parse/sync';
import { TransactionImportRow } from 'src/core/transaction/import/transaction-import.types';

const MAX_ROWS = 2000;
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

export class TransactionCsvParser {
    static parse(csvBuffer: Buffer): TransactionImportRow[] {
        const records: Record<string, string>[] = parse(csvBuffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
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

        return records.slice(0, MAX_ROWS).map((rec) => ({
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
