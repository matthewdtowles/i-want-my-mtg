import { RawQueryOptions } from './safe-query-options.dto';
import { SortOptions } from './sort-options.enum';

export function sanitizeInt(value: string | number | undefined, defaultValue: number): number {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'number') return value < 1 ? defaultValue : value;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
}

export function safeAlphaNumeric(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const sanitized = value.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    return sanitized.length > 0 ? sanitized : undefined;
}

export function safeSort(value: string | SortOptions | undefined): SortOptions | undefined {
    if (!value) return undefined;
    const validSorts = Object.values(SortOptions);
    return validSorts.includes(value as SortOptions) ? (value as SortOptions) : undefined;
}

export function safeBoolean(
    value: string | boolean | undefined,
    defaultValue: boolean = true
): boolean {
    if (value === undefined || value === null) return defaultValue;
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
