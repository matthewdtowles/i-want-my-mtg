import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";

export const BASE_IMAGE_URL: string = "https://cards.scryfall.io";

export function toDollar(amount: number): string {
    let dollarAmount: string = "-";
    if (amount) {
        const roundedNumber = Math.round(amount * 100) / 100;
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
    if (typeof options.ascend === "boolean") params.push(`ascend=${options.ascend}`);
    if (options.sort) params.push(`sort=${options.sort}`);
    if (options.baseOnly === false) params.push(`baseOnly=false`);
    return params.length > 0 ? `?${params.join("&")}` : "";
}

export function completionRate(totalOwned: number, totalCards: number): number {
    if (totalCards <= 0 || totalOwned <= 0) return 0;
    if (totalOwned >= totalCards) return 100;
    const completionRate = (totalOwned / totalCards) * 100;
    return Math.round(completionRate * 100) / 100;
}