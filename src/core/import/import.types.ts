export interface ImportError {
    row: number;
    error: string;
    [key: string]: unknown;
}

export interface ImportResult {
    saved: number;
    skipped: number;
    deleted: number;
    errors: ImportError[];
}

/** Known sources for an inventory CSV import; used to label the result. */
export type ImportFormat = 'native' | 'archidekt' | 'moxfield' | 'deckbox' | 'tcgplayer';

/** Pretty labels for the UI; keep in sync with ImportFormat. */
export const IMPORT_FORMAT_LABELS: Record<ImportFormat, string> = {
    native: 'Native CSV',
    archidekt: 'Archidekt',
    moxfield: 'Moxfield',
    deckbox: 'Deckbox',
    tcgplayer: 'TCGPlayer',
};

export function parseBool(value: string | undefined, defaultValue = false): boolean {
    if (value === undefined || value === '') return defaultValue;
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
}
