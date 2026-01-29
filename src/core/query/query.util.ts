import { SortOptions } from './sort-options.enum';

export function sanitizeInt(value: any, defaultValue: number): number {
    const parsed = parseInt(value);
    return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
}

export function safeAlphaNumeric(value: any): string | undefined {
    if (!value || typeof value !== 'string') return undefined;
    const sanitized = value.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    return sanitized.length > 0 ? sanitized : undefined;
}

export function safeSort(value: any): SortOptions | undefined {
    if (!value || typeof value !== 'string') return undefined;
    const validSorts = Object.values(SortOptions);
    return validSorts.includes(value as SortOptions) ? (value as SortOptions) : undefined;
}

export function safeBoolean(value: any): boolean {
    // Only return false if explicitly set to false
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'false' || lower === '0') return false;
    }
    if (value === false || value === 0) return false;
    // Default to true
    return true;
}
