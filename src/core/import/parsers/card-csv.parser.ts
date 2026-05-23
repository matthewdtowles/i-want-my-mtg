import { parse } from 'csv-parse/sync';
import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';

const EXPECTED_HEADERS = new Set(['id', 'name', 'set_code', 'number', 'quantity', 'foil']);

/**
 * Native IWMM card CSV format — the same shape exportInventory produces.
 * Headers are case-sensitive (lowercase) and validated strictly; unknown
 * columns throw with a list of expected headers so the user can fix the
 * file. This is the fallback when no external format matches.
 */
export class CardCsvParser {
    static parse(csvBuffer: Buffer): CardImportRow[] {
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
                    `Unknown column: "${h}". Expected: id, name, set_code, number, quantity, foil`
                );
            }
        }

        return records.map((rec) => {
            const quantity = rec.quantity?.trim();
            return {
                id: rec.id?.trim() || undefined,
                name: rec.name?.trim() || undefined,
                set_code: rec.set_code?.trim() || undefined,
                number: rec.number?.trim() || undefined,
                quantity: quantity !== '' ? quantity : undefined,
                foil: rec.foil?.trim() || undefined,
            };
        });
    }
}
