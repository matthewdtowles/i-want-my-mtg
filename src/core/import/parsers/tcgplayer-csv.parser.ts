import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';
import { mapFoilValue, matchesHeaders, parseLowercased } from './csv-helpers';

const FOIL_VALUES = new Set(['foil', 'etched']);

/**
 * TCGPlayer collection CSV in either of two shapes:
 *
 * 1. App "Export Collection" — Quantity, Name, Set, Card Number, Set Code,
 *    Printing, … Maps Set Code → set_code, Card Number → number.
 * 2. Seller "TCG Inventory" — TCGplayer Id, Product Line, Set Name, Product
 *    Name, Number, Total Quantity, … Maps Set Name → set_name (resolved to
 *    set_code at import time) and filters out non-Magic Product Line rows.
 */
export class TcgplayerCsvParser {
    static readonly APP_SIGNATURE = ['set code', 'printing'] as const;
    static readonly SELLER_SIGNATURE = ['tcgplayer id', 'product line'] as const;

    static matchesFormat(headers: string[]): boolean {
        return (
            matchesHeaders(headers, TcgplayerCsvParser.APP_SIGNATURE) ||
            matchesHeaders(headers, TcgplayerCsvParser.SELLER_SIGNATURE)
        );
    }

    static parse(csvBuffer: Buffer): CardImportRow[] {
        const records = parseLowercased(csvBuffer);
        if (records.length === 0) return [];

        const firstRow = records[0];
        const isSeller = 'tcgplayer id' in firstRow && 'product line' in firstRow;
        return isSeller
            ? TcgplayerCsvParser.parseSeller(records)
            : TcgplayerCsvParser.parseApp(records);
    }

    private static parseApp(records: Record<string, string>[]): CardImportRow[] {
        return records.map((rec) => {
            const quantity = rec['quantity']?.trim();
            const setCode = rec['set code']?.trim().toLowerCase();
            return {
                name: rec['name']?.trim() || undefined,
                set_code: setCode || undefined,
                number: rec['card number']?.trim() || undefined,
                quantity: quantity ? quantity : undefined,
                foil: mapFoilValue(rec['printing'], {
                    foilLike: FOIL_VALUES,
                    blankAs: undefined,
                }),
            };
        });
    }

    private static parseSeller(records: Record<string, string>[]): CardImportRow[] {
        const magicRows = records.filter((rec) => {
            const line = rec['product line']?.trim().toLowerCase();
            return !line || line === 'magic' || line === 'magic: the gathering';
        });

        return magicRows.map((rec) => {
            const quantity = (rec['total quantity'] ?? rec['quantity'])?.trim();
            const name = (rec['product name'] ?? rec['name'])?.trim();
            return {
                name: name || undefined,
                set_name: rec['set name']?.trim() || undefined,
                number: rec['number']?.trim() || undefined,
                quantity: quantity ? quantity : undefined,
                foil: mapFoilValue(rec['printing'], {
                    foilLike: FOIL_VALUES,
                    blankAs: undefined,
                }),
            };
        });
    }
}
