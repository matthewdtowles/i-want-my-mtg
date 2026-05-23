import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';
import { mapFoilValue, matchesHeaders, parseLowercased } from './csv-helpers';

const FOIL_VALUES = new Set(['foil', 'etched', 'glossy']);

/**
 * Moxfield collection CSV export. Edition holds the (lowercase) set code and
 * Foil is blank for non-foil; "foil" / "etched" / "glossy" for finishes we
 * collapse to foil. Tradelist Count + Last Modified together are distinctive
 * vs. Deckbox (which has Card Number) and Archidekt (which has Edition Code).
 */
export class MoxfieldCsvParser {
    static readonly SIGNATURE_HEADERS = ['tradelist count', 'last modified'] as const;

    static matchesFormat(headers: string[]): boolean {
        return matchesHeaders(headers, MoxfieldCsvParser.SIGNATURE_HEADERS);
    }

    static parse(csvBuffer: Buffer): CardImportRow[] {
        const records = parseLowercased(csvBuffer);
        return records.map((rec) => {
            const quantity = rec['count']?.trim();
            const setCode = rec['edition']?.trim().toLowerCase();
            return {
                name: rec['name']?.trim() || undefined,
                set_code: setCode || undefined,
                number: rec['collector number']?.trim() || undefined,
                quantity: quantity ? quantity : undefined,
                foil: mapFoilValue(rec['foil'], { foilLike: FOIL_VALUES, blankAs: 'false' }),
            };
        });
    }
}
