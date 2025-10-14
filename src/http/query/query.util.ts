export function sanitizeInt(value: any, defaultValue: number): number {
    if (value == null || value === "") {
        return defaultValue;
    }
    if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
        return value;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) return defaultValue;
        const parsed = parseInt(trimmed, 10);
        if (!isNaN(parsed) && parsed >= 1) {
            return parsed;
        }
    }
    return defaultValue;
}

export function safeAlphaNumeric(value: any): string | null {
    if (!value || value.trim().length === 0) {
        return null;
    }
    let sanitized = value.trim().replace(/[^a-zA-Z0-9\-]/g, " ");
    // Collapse multiple spaces to a single space
    sanitized = sanitized.replace(/\s+/g, " ");
    const charLimit = 25;
    if (sanitized.length > charLimit) {
        sanitized = sanitized.substring(0, charLimit);
    }
    return sanitized.length > 0 ? sanitized : null;
}

export function safeBoolean(value: any, defaultValue: boolean): boolean {
    if (value == null || value === "") {
        return defaultValue;
    }
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        if (trimmed === "true") return true;
        if (trimmed === "false") return false;
    }
    return defaultValue;
}