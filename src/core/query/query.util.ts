import { RawQueryOptions } from './safe-query-options.dto';
import { SortOptions } from './sort-options.enum';

// All sanitizers accept `unknown`: Express/qs can parse a repeated query param
// (`?x=a&x=b`) as an array, so a value typed `string` at the call site may be a
// `string[]` at runtime. Each returns its default rather than calling a string
// method on a non-string (which would throw and surface as a 500).

export function sanitizeInt(value: unknown, defaultValue: number, max?: number): number {
    let n: number;
    if (typeof value === 'number') {
        n = value < 1 ? defaultValue : value;
    } else if (typeof value !== 'string') {
        n = defaultValue;
    } else {
        const parsed = parseInt(value, 10);
        n = isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
    }
    return max !== undefined ? Math.min(n, max) : n;
}

export function safeAlphaNumeric(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const sanitized = value.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    return sanitized.length > 0 ? sanitized : undefined;
}

export function safeSearchTerm(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const sanitized = value.replace(/[^a-zA-Z0-9\s\-',.;:/]/g, '').trim();
    return sanitized.length > 0 ? sanitized : undefined;
}

export function safeSort(value: unknown): SortOptions | undefined {
    if (typeof value !== 'string') return undefined;
    const validSorts: readonly string[] = Object.values(SortOptions);
    return validSorts.includes(value) ? (value as SortOptions) : undefined;
}

/**
 * Narrows a requested sort to the set a query can actually honor. Returns the
 * sort if it is in `allowedSorts`, otherwise `undefined` so the caller falls back
 * to its default sort. Keeps an endpoint-inapplicable (but globally valid) sort
 * from reaching `ORDER BY` and producing a SQL error on an unjoined alias.
 */
export function resolveSort(
    sort: SortOptions | undefined,
    allowedSorts: readonly SortOptions[]
): SortOptions | undefined {
    return sort && allowedSorts.includes(sort) ? sort : undefined;
}

export function safeBoolean(value: unknown, defaultValue: boolean = true): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return defaultValue;
    const lower = value.toLowerCase();
    if (lower === 'false' || lower === '0') return false;
    if (lower === 'true' || lower === '1') return true;
    return defaultValue;
}

export function safeLastPage(rawQueryOptions: RawQueryOptions, minLast: number): string {
    const limit = sanitizeInt(rawQueryOptions.limit, 25);
    const page = sanitizeInt(rawQueryOptions.page, 1);
    const lastPage = Math.max(1, Math.ceil(minLast / limit));
    return String(Math.min(page, lastPage));
}
