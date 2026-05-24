import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';
import { mapFoilValue, matchesHeaders, parseLowercased } from './csv-helpers';

const FOIL_VALUES = new Set(['foil', 'etched']);

/**
 * Archidekt collection CSV export. Columns: Quantity, Name, Finish, Condition,
 * Date Added, Language, Purchase Price, Tags, Edition Name, Edition Code,
 * Multiverse Id, Scryfall ID, MTGO ID, Collector Number. Maps onto the shared
 * CardImportRow shape; condition/language/price/tags are intentionally
 * dropped.
 */
export class ArchidektCsvParser {
    static readonly SIGNATURE_HEADERS = ['edition code', 'finish'] as const;

    static matchesFormat(headers: string[]): boolean {
        return matchesHeaders(headers, ArchidektCsvParser.SIGNATURE_HEADERS);
    }

    static parse(csvBuffer: Buffer): CardImportRow[] {
        const records = parseLowercased(csvBuffer);
        return records.map((rec) => {
            const quantity = rec['quantity']?.trim();
            const setCode = rec['edition code']?.trim().toLowerCase();
            return {
                id: rec['scryfall id']?.trim() || undefined,
                name: rec['name']?.trim() || undefined,
                set_code: setCode || undefined,
                number: rec['collector number']?.trim() || undefined,
                quantity: quantity ? quantity : undefined,
                foil: mapFoilValue(rec['finish'], { foilLike: FOIL_VALUES, blankAs: undefined }),
            };
        });
    }
}
