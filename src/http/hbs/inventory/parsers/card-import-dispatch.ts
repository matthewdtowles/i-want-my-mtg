import { parse } from 'csv-parse/sync';
import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';
import { ArchidektCsvParser } from './archidekt-csv.parser';
import { CardCsvParser } from './card-csv.parser';

/**
 * Parses a card import CSV, auto-detecting the source format from its header
 * row. Archidekt collection exports are recognized and mapped onto the shared
 * import shape; anything else is treated as the native IWMM format.
 */
export function parseCardImport(csvBuffer: Buffer): CardImportRow[] {
    const headerRows: string[][] = parse(csvBuffer, {
        skip_empty_lines: true,
        to_line: 1,
    });
    const headers = headerRows[0] ?? [];

    if (ArchidektCsvParser.matchesFormat(headers)) {
        return ArchidektCsvParser.parse(csvBuffer);
    }
    return CardCsvParser.parse(csvBuffer);
}
