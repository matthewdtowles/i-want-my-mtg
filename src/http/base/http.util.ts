import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";

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

export function buildQueryString(options: SafeQueryOptions): string {
    const params = [];
    if (options.page) params.push(`page=${options.page}`);
    if (options.limit) params.push(`limit=${options.limit}`);
    if (options.filter) params.push(`filter=${options.filter}`);
    if (typeof options.ascend === "boolean") params.push(`ascend=${options.ascend}`)
    if (options.sort) params.push(`sort=${options.sort}`);
    return params.length > 0 ? `?${params.join("&")}` : "";
}