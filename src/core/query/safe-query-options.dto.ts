import { isEnumValue } from "../validation.util";
import { SortOptions } from "./sort-options.enum";

export class SafeQueryOptions {
    readonly page: number;
    readonly limit: number;
    readonly ascend: boolean;
    readonly filter?: string;
    readonly sort?: SortOptions;

    constructor(init?: Partial<SafeQueryOptions>) {
        init = init || {};
        this.page = this.sanitizeInt(init.page, 1);
        this.limit = this.sanitizeInt(init.limit, 25);
        this.ascend = this.safeBoolean(init.ascend, false);
        this.filter = this.safeAlphaNumeric(init.filter);
        this.sort = this.safeSort(init.sort);
    }

    // TODO: THIS NEEDS TO BE USED TO INJECT INTO HBS!!!
    buildQueryString(): string {
        const params = [];
        if (this.page) params.push(`page=${this.page}`);
        if (this.limit) params.push(`limit=${this.limit}`);
        if (this.filter) params.push(`filter=${this.filter}`);
        if (typeof this.ascend === "boolean") params.push(`ascend=${this.ascend}`)
        if (this.sort) params.push(`sort=${this.sort}`);
        return params.length > 0 ? `?${params.join("&")}` : "";
    }

    private sanitizeInt(value: any, defaultValue: number): number {
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

    private safeAlphaNumeric(value: any): string | null {
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

    private safeBoolean(value: any, defaultValue: boolean): boolean {
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

    private safeSort(value: any): SortOptions | null {
        return isEnumValue(SortOptions, value) ? value : null;
    }
}