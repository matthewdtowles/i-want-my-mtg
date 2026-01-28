import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';

export const BASE_IMAGE_URL: string = 'https://cards.scryfall.io';

export function toDollar(amount: number): string {
    let dollarAmount: string = '-';
    if (amount) {
        const roundedNumber = Math.round(amount * 100) / 100;
        dollarAmount = roundedNumber.toFixed(2);
        dollarAmount = '$' + dollarAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return dollarAmount;
}

export function isAuthenticated(req: AuthenticatedRequest): boolean {
    return req.user != null && typeof req.isAuthenticated === 'function'
        ? req.isAuthenticated()
        : false;
}

export function buildQueryString(options: SafeQueryOptions): string {
    const params = new URLSearchParams();
    if (options.page && options.page !== 1) {
        params.set('page', String(options.page));
    }
    if (options.limit && options.limit !== 25) {
        params.set('limit', String(options.limit));
    }
    if (options.filter) {
        params.set('filter', options.filter);
    }
    if (options.sort) {
        params.set('sort', options.sort);
    }
    if (options.ascend !== undefined) {
        params.set('ascend', String(options.ascend));
    }
    params.set('baseOnly', String(options.baseOnly));
    const query = params.toString();
    return query ? `?${query}` : '';
}

export function completionRate(totalOwned: number, totalCards: number): number {
    if (totalCards <= 0 || totalOwned <= 0) return 0;
    if (totalOwned >= totalCards) return 100;
    const completionRate = (totalOwned / totalCards) * 100;
    return Math.round(completionRate * 100) / 100;
}
