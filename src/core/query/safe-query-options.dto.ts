import { safeAlphaNumeric, safeBoolean, safeSort, sanitizeInt } from './query.util';
import { SortOptions } from './sort-options.enum';

export interface RawQueryOptions {
    ascend?: string;
    baseOnly?: string;
    filter?: string;
    limit?: string;
    page?: string;
    sort?: string;
}

export interface QueryOptionsData {
    readonly ascend?: boolean;
    readonly baseOnly: boolean;
    readonly filter?: string;
    readonly limit: number;
    readonly page: number;
    readonly sort?: SortOptions;
}

export class SafeQueryOptions implements QueryOptionsData {
    readonly ascend?: boolean;
    readonly baseOnly: boolean;
    readonly filter?: string;
    readonly limit: number;
    readonly page: number;
    readonly sort?: SortOptions;

    constructor(init?: RawQueryOptions) {
        init = init || {};
        this.ascend = safeBoolean(init.ascend);
        this.baseOnly = safeBoolean(init.baseOnly);
        this.filter = safeAlphaNumeric(init.filter);
        this.limit = sanitizeInt(init.limit, 25);
        this.page = sanitizeInt(init.page, 1);
        this.sort = safeSort(init.sort);
    }

    withBaseOnly(baseOnly: boolean): SafeQueryOptions {
        return new SafeQueryOptions({
            ascend: this.ascend !== undefined ? String(this.ascend) : undefined,
            baseOnly: String(baseOnly),
            filter: this.filter,
            limit: String(this.limit),
            page: String(this.page),
            sort: this.sort,
        });
    }
}
