import { parse } from 'csv-parse/sync';
import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';
import { ImportFormat } from '../import.types';
import { ArchidektCsvParser } from './archidekt-csv.parser';
import { CardCsvParser } from './card-csv.parser';
import { DeckboxCsvParser } from './deckbox-csv.parser';
import { MoxfieldCsvParser } from './moxfield-csv.parser';
import { TcgplayerCsvParser } from './tcgplayer-csv.parser';

interface ExternalCardCsvParser {
    readonly format: ImportFormat;
    matchesFormat(headers: string[]): boolean;
    parse(csvBuffer: Buffer): CardImportRow[];
}

/**
 * Ordered list of external format adapters. The first parser whose
 * `matchesFormat` accepts the file's header row owns the file; if none
 * match we fall back to the native IWMM CardCsvParser.
 *
 * Adding a format: implement a new parser exposing `format`, `matchesFormat`,
 * and `parse`, and append it here. Order matters when two signatures overlap
 * (e.g. any future export also using `Tradelist Count` would clash with
 * Moxfield/Deckbox); put the more-specific signature first.
 */
const EXTERNAL_PARSERS: Array<ExternalCardCsvParser & { format: ImportFormat }> = [
    {
        format: 'archidekt',
        matchesFormat: ArchidektCsvParser.matchesFormat,
        parse: ArchidektCsvParser.parse,
    },
    {
        format: 'moxfield',
        matchesFormat: MoxfieldCsvParser.matchesFormat,
        parse: MoxfieldCsvParser.parse,
    },
    {
        format: 'deckbox',
        matchesFormat: DeckboxCsvParser.matchesFormat,
        parse: DeckboxCsvParser.parse,
    },
    {
        format: 'tcgplayer',
        matchesFormat: TcgplayerCsvParser.matchesFormat,
        parse: TcgplayerCsvParser.parse,
    },
];

export interface ParsedCardImport {
    format: ImportFormat;
    rows: CardImportRow[];
}

/**
 * Parses a card import CSV, auto-detecting the source format from its header
 * row. External collection exports (Archidekt, Moxfield, Deckbox, TCGPlayer)
 * are recognized and mapped onto the shared import shape; anything else is
 * treated as the native IWMM format.
 */
export function parseCardImport(csvBuffer: Buffer): ParsedCardImport {
    const headerRows: string[][] = parse(csvBuffer, {
        skip_empty_lines: true,
        to_line: 1,
        bom: true,
    });
    const headers = headerRows[0] ?? [];

    for (const parser of EXTERNAL_PARSERS) {
        if (parser.matchesFormat(headers)) {
            return { format: parser.format, rows: parser.parse(csvBuffer) };
        }
    }
    return { format: 'native', rows: CardCsvParser.parse(csvBuffer) };
}
