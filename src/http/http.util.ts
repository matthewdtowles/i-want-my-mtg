import { AuthenticatedRequest } from "./auth/dto/authenticated.request";

export const BASE_IMAGE_URL: string = "https://cards.scryfall.io";

export function toDollar(amount: number): string {
    let dollarAmount: string = "-";
    if (amount) {
        const roundedNumber = Math.ceil(amount * 100) / 100;
        dollarAmount = roundedNumber.toFixed(2);
        dollarAmount = "$" + dollarAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return dollarAmount;
}

export function isAuthenticated(req: AuthenticatedRequest): boolean {
    return req.user != null && typeof req.isAuthenticated === "function" ? req.isAuthenticated() : false;
}

export function sanitizeInt(value: string | undefined, defaultValue: number): number {
    if (!value) {
        return defaultValue;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) {
        return defaultValue;
    }
    return parsed;
}

export function safeAlphaNumeric(value: string): string | null {
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