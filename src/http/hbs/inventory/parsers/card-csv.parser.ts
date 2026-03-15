import { parse } from 'csv-parse/sync';
import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';

const MAX_ROWS = 2000;
const EXPECTED_HEADERS = new Set(['id', 'name', 'set_code', 'number', 'quantity', 'foil']);

export class CardCsvParser {
    static parse(csvBuffer: Buffer): CardImportRow[] {
        const records: Record<string, string>[] = parse(csvBuffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        if (records.length === 0) {
            return [];
        }

        // Validate headers
        const headers = Object.keys(records[0]);
        for (const h of headers) {
            if (!EXPECTED_HEADERS.has(h)) {
                throw new Error(
                    `Unknown column: "${h}". Expected: id, name, set_code, number, quantity, foil`
                );
            }
        }

        return records.slice(0, MAX_ROWS).map((rec) => {
            const quantity = rec.quantity?.trim();
            return {
                id: rec.id?.trim() || undefined,
                name: rec.name?.trim() || undefined,
                set_code: rec.set_code?.trim() || undefined,
                number: rec.number?.trim() || undefined,
                // Treat empty string as undefined (no quantity specified)
                quantity: quantity !== '' ? quantity : undefined,
                foil: rec.foil?.trim() || undefined,
            };
        });
    }
}
