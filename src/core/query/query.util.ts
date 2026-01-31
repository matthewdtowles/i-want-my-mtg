import { RawQueryOptions } from './safe-query-options.dto';
import { SortOptions } from './sort-options.enum';

export function sanitizeInt(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
}

export function safeAlphaNumeric(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const sanitized = value.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    return sanitized.length > 0 ? sanitized : undefined;
}

export function safeSort(value: string | undefined): SortOptions | undefined {
    if (!value) return undefined;
    const validSorts = Object.values(SortOptions);
    return validSorts.includes(value as SortOptions) ? (value as SortOptions) : undefined;
}

export function safeBoolean(value: string | undefined, defaultValue: boolean = true): boolean {
    if (!value) return defaultValue;
    const lower = value.toLowerCase();
    if (lower === 'false' || lower === '0') return false;
    if (lower === 'true' || lower === '1') return true;
    return defaultValue;
}

export function safeLastPage(rawQueryOptions: RawQueryOptions, minLast: number): string {
    const lastPage = Math.max(1, Math.ceil(minLast / parseInt(rawQueryOptions.limit)));
    return String(Math.min(parseInt(rawQueryOptions.page), lastPage));
}