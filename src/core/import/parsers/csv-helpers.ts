import { parse } from 'csv-parse/sync';

/**
 * Parse a CSV buffer with normalized (lowercased, trimmed) header keys and
 * trimmed values. The result is an array of records keyed by the normalized
 * header — convenient for format adapters that need case-insensitive access.
 */
export function parseLowercased(csvBuffer: Buffer): Record<string, string>[] {
    return parse(csvBuffer, {
        columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });
}

/**
 * True when every signature column appears (case-insensitively) in the file's
 * header row. Used by external-format parsers' `matchesFormat` methods to
 * claim a file.
 */
export function matchesHeaders(headers: string[], signatures: readonly string[]): boolean {
    const normalized = headers.map((h) => h.trim().toLowerCase());
    return signatures.every((sig) => normalized.includes(sig));
}

export interface FoilMapOptions {
    /** Values (lowercased) that should be treated as foil. */
    readonly foilLike: ReadonlySet<string>;
    /**
     * What to return for a blank/missing value. Most external formats put
     * a blank in the foil column for non-foil; the native CSV omits the
     * column entirely and falls through to auto-detection downstream.
     */
    readonly blankAs: 'false' | undefined;
}

/**
 * Normalize a vendor-specific foil column value into the "true" / "false" /
 * undefined trinary that the shared resolver expects. Etched / glossy
 * printings collapse to foil because the schema has no separate flag.
 */
export function mapFoilValue(
    value: string | undefined,
    options: FoilMapOptions
): string | undefined {
    const v = value?.trim().toLowerCase();
    if (!v) return options.blankAs;
    return options.foilLike.has(v) ? 'true' : 'false';
}
