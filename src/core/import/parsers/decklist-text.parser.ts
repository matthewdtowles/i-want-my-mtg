import { ImportError } from 'src/core/import/import.types';

/** One resolvable line of a pasted decklist. */
export interface ParsedDeckLine {
    quantity: number;
    name: string;
    setCode?: string;
    number?: string;
    isSideboard: boolean;
    /** 1-based source line, for error reporting. */
    line: number;
}

export interface ParsedDecklist {
    rows: ParsedDeckLine[];
    errors: ImportError[];
}

// "Sideboard" header switches subsequent lines to the sideboard (optionally
// prefixed with // or #, as some exports do).
const SIDEBOARD_HEADER = /^(?:\/\/|#)?\s*sideboard\b/i;
// A per-line "SB:" prefix (Magic Workstation style) marks a single sideboard line.
const SB_PREFIX = /^SB:\s*/i;
// An entry leads with a count: "4 Name", "4x Name", "4 x Name".
const ENTRY = /^(\d+)\s*[xX]?\s+(.+?)\s*$/;
// Name with an optional (SET)/[SET] code and an optional collector number,
// e.g. "Sol Ring (CMR) 263" or "Lightning Bolt [2X2]".
const SET_SUFFIX = /^(.*?)\s*[([]([A-Za-z0-9]{2,6})[)\]](?:\s+([A-Za-z0-9-]+))?\s*$/;
// MTGO foil/etched markers trailing a line: "... *F*" / "... *E*".
const FOIL_MARKER = /\s*\*[fe]\*\s*$/i;

/**
 * Parse a pasted decklist in the common text formats people share online
 * (Arena, Moxfield, MTGGoldfish, Archidekt copy-export). Lines that don't lead
 * with a count are treated as section headers / comments and skipped, since
 * every common export prefixes entries with a quantity. A "Sideboard" header
 * (or a per-line "SB:" prefix) routes cards to the sideboard.
 *
 * Card resolution (name -> printing) happens later in the import service; this
 * parser only structures the text. `errors` carries lines that look like an
 * entry (lead with digits) but can't be parsed.
 */
export function parseDecklistText(text: string): ParsedDecklist {
    const rows: ParsedDeckLine[] = [];
    const errors: ImportError[] = [];
    let sideboard = false;

    const lines = (text ?? '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const raw = lines[i].trim();
        if (!raw) continue;

        if (SIDEBOARD_HEADER.test(raw)) {
            sideboard = true;
            continue;
        }

        let body = raw;
        let lineSideboard = sideboard;
        if (SB_PREFIX.test(body)) {
            body = body.replace(SB_PREFIX, '');
            lineSideboard = true;
        }

        const entry = ENTRY.exec(body);
        if (!entry) {
            // Lines that begin with a digit looked like an entry but didn't
            // parse; everything else is a header/comment we silently skip.
            if (/^\d/.test(body)) {
                errors.push({ row: lineNum, error: `Could not parse line: "${raw}"` });
            }
            continue;
        }

        const quantity = parseInt(entry[1], 10);
        if (!quantity || quantity < 1) continue;

        let remainder = entry[2].replace(FOIL_MARKER, '').trim();
        let setCode: string | undefined;
        let number: string | undefined;
        const suffix = SET_SUFFIX.exec(remainder);
        if (suffix) {
            remainder = suffix[1].trim();
            setCode = suffix[2].toLowerCase();
            number = suffix[3];
        }

        if (!remainder) {
            errors.push({ row: lineNum, error: `Missing card name on line: "${raw}"` });
            continue;
        }

        rows.push({
            quantity,
            name: remainder,
            setCode,
            number,
            isSideboard: lineSideboard,
            line: lineNum,
        });
    }

    return { rows, errors };
}
