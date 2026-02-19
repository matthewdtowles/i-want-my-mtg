import { parse } from 'csv-parse/sync';
import { SetImportRow } from 'src/core/inventory/import/inventory-import.types';

const EXPECTED_HEADERS = new Set(['set_code', 'set_name', 'foil', 'include_variants']);

export class SetCsvParser {
    static parse(csvBuffer: Buffer): SetImportRow[] {
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
                    `Unknown column: "${h}". Expected: set_code, set_name, foil, include_variants`
                );
            }
        }

        return records.map((rec) => ({
            set_code: rec.set_code?.trim() || undefined,
            set_name: rec.set_name?.trim() || undefined,
            foil: rec.foil?.trim() || undefined,
            include_variants: rec.include_variants?.trim() || undefined,
        }));
    }
}
