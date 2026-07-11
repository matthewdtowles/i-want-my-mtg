import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Format } from 'src/core/card/format.enum';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { safeAlphaNumeric, safeBoolean, safeSearchTerm, safeSort, sanitizeInt } from './query.util';
import { SortOptions } from './sort-options.enum';

// Upper bound on any list endpoint's page size. Without it a public request
// (`?limit=1000000`) would build a giant join; a handful saturate Postgres.
export const MAX_PAGE_LIMIT = 100;

export const PUBLIC_RARITIES: ReadonlySet<CardRarity> = new Set([
    CardRarity.Common,
    CardRarity.Uncommon,
    CardRarity.Rare,
    CardRarity.Mythic,
]);

// Set codes are stored lowercase (matches keyrune CSS class convention used in views).
// Lowercasing input lets callers pass either case in the API.
// All helpers accept `unknown` because a repeated query param can arrive as an
// array at runtime; a non-string returns the lenient default rather than throwing.
function safeSetCode(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
    return cleaned.length > 0 ? cleaned.toLowerCase() : undefined;
}

// Exported so the strict API validator decides "is this a valid rarity/format"
// with the exact same logic, instead of re-deriving it and risking divergence.
export function safeRarity(value: unknown): CardRarity | undefined {
    if (typeof value !== 'string') return undefined;
    const lower = value.toLowerCase() as CardRarity;
    return PUBLIC_RARITIES.has(lower) ? lower : undefined;
}

export function safeFormat(value: unknown): Format | undefined {
    if (typeof value !== 'string') return undefined;
    const lower = value.toLowerCase() as Format;
    return Object.values(Format).includes(lower) ? lower : undefined;
}

function safeLegality(value: unknown, format: Format | undefined): LegalityStatus | undefined {
    if (!format) return undefined;
    if (typeof value !== 'string' || value === '') return LegalityStatus.Legal;
    const lower = value.toLowerCase() as LegalityStatus;
    return Object.values(LegalityStatus).includes(lower) ? lower : LegalityStatus.Legal;
}

export interface RawQueryOptions {
    ascend?: string;
    baseOnly?: string;
    filter?: string;
    format?: string;
    legality?: string;
    limit?: string;
    page?: string;
    q?: string;
    rarity?: string;
    setCode?: string;
    sort?: string;
    type?: string;
}

export interface QueryOptionsData {
    readonly ascend?: boolean;
    readonly baseOnly: boolean;
    readonly filter?: string;
    readonly format?: Format;
    readonly includedSetTypes?: string[] | null;
    readonly legality?: LegalityStatus;
    readonly limit: number;
    readonly page: number;
    readonly q?: string;
    readonly rarity?: CardRarity;
    readonly setCode?: string;
    readonly sort?: SortOptions;
    readonly type?: string;
}

export class SafeQueryOptions implements QueryOptionsData {
    readonly ascend?: boolean;
    readonly baseOnly: boolean;
    readonly filter?: string;
    readonly format?: Format;
    readonly includedSetTypes?: string[] | null;
    readonly legality?: LegalityStatus;
    readonly limit: number;
    readonly page: number;
    readonly rarity?: CardRarity;
    readonly setCode?: string;
    readonly sort?: SortOptions;
    readonly type?: string;

    constructor(init?: RawQueryOptions, extra?: { includedSetTypes?: string[] | null }) {
        init = init || {};
        this.ascend = safeBoolean(init.ascend);
        this.baseOnly = safeBoolean(init.baseOnly);
        this.filter = safeSearchTerm(init.filter);
        this.format = safeFormat(init.format);
        this.legality = safeLegality(init.legality, this.format);
        this.limit = sanitizeInt(init.limit, 25, MAX_PAGE_LIMIT);
        this.page = sanitizeInt(init.page, 1);
        this.rarity = safeRarity(init.rarity);
        this.setCode = safeSetCode(init.setCode);
        this.sort = safeSort(init.sort);
        this.type = safeAlphaNumeric(init.type);
        this.includedSetTypes = extra?.includedSetTypes ?? null;
    }

    withBaseOnly(baseOnly: boolean): SafeQueryOptions {
        return new SafeQueryOptions(
            {
                ascend: this.ascend !== undefined ? String(this.ascend) : undefined,
                baseOnly: String(baseOnly),
                filter: this.filter,
                format: this.format,
                legality: this.legality,
                limit: String(this.limit),
                page: String(this.page),
                rarity: this.rarity,
                setCode: this.setCode,
                sort: this.sort,
                type: this.type,
            },
            { includedSetTypes: this.includedSetTypes }
        );
    }

    withSetTypes(includedSetTypes: string[] | null): SafeQueryOptions {
        return new SafeQueryOptions(
            {
                ascend: this.ascend !== undefined ? String(this.ascend) : undefined,
                baseOnly: String(this.baseOnly),
                filter: this.filter,
                format: this.format,
                legality: this.legality,
                limit: String(this.limit),
                page: String(this.page),
                rarity: this.rarity,
                setCode: this.setCode,
                sort: this.sort,
                type: this.type,
            },
            { includedSetTypes }
        );
    }
}
