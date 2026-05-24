import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';
import { mapFoilValue, matchesHeaders, parseLowercased } from './csv-helpers';

const FOIL_VALUES = new Set(['foil', 'etched']);

/**
 * Deckbox inventory CSV export. Edition is the full set name (e.g. "Beta",
 * "Magic 2015") — not a code — so the resolver looks the set up by name.
 * Tradelist Count + Card Number is the distinctive signature.
 */
export class DeckboxCsvParser {
    static readonly SIGNATURE_HEADERS = ['tradelist count', 'card number'] as const;

    static matchesFormat(headers: string[]): boolean {
        return matchesHeaders(headers, DeckboxCsvParser.SIGNATURE_HEADERS);
    }

    static parse(csvBuffer: Buffer): CardImportRow[] {
        const records = parseLowercased(csvBuffer);
        return records.map((rec) => {
            const quantity = rec['count']?.trim();
            return {
                name: rec['name']?.trim() || undefined,
                set_name: rec['edition']?.trim() || undefined,
                number: rec['card number']?.trim() || undefined,
                quantity: quantity ? quantity : undefined,
                foil: mapFoilValue(rec['foil'], { foilLike: FOIL_VALUES, blankAs: 'false' }),
            };
        });
    }
}
