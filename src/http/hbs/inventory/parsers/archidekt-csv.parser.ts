import { parse } from 'csv-parse/sync';
import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';

const MAX_ROWS = 2000;

/**
 * Parses an Archidekt collection CSV export into the shared CardImportRow shape.
 *
 * Archidekt exports columns: Quantity, Name, Finish, Condition, Date Added,
 * Language, Purchase Price, Tags, Edition Name, Edition Code, Multiverse Id,
 * Scryfall ID, MTGO ID, Collector Number. Only the columns that map onto our
 * inventory (card identity, quantity, foil) are read; the rest are ignored.
 */
export class ArchidektCsvParser {
    /** Columns whose presence identifies a file as an Archidekt export. */
    static readonly SIGNATURE_HEADERS = ['edition code', 'finish'];

    static matchesFormat(headers: string[]): boolean {
        const normalized = headers.map((h) => h.trim().toLowerCase());
        return ArchidektCsvParser.SIGNATURE_HEADERS.every((sig) => normalized.includes(sig));
    }

    static parse(csvBuffer: Buffer): CardImportRow[] {
        const records: Record<string, string>[] = parse(csvBuffer, {
            columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
            skip_empty_lines: true,
            trim: true,
        });

        return records.slice(0, MAX_ROWS).map((rec) => {
            const quantity = rec['quantity']?.trim();
            const setCode = rec['edition code']?.trim().toLowerCase();
            return {
                id: rec['scryfall id']?.trim() || undefined,
                name: rec['name']?.trim() || undefined,
                set_code: setCode || undefined,
                number: rec['collector number']?.trim() || undefined,
                quantity: quantity ? quantity : undefined,
                foil: ArchidektCsvParser.mapFinish(rec['finish']),
            };
        });
    }

    /**
     * Archidekt's Finish is one of Normal/Foil/Etched. Our schema has no
     * separate etched printing, so etched cards are imported as foil.
     */
    private static mapFinish(finish: string | undefined): string | undefined {
        const value = finish?.trim().toLowerCase();
        if (!value) return undefined;
        if (value === 'foil' || value === 'etched') return 'true';
        return 'false';
    }
}
