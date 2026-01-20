import { safeAlphaNumeric, safeBoolean, safeSort, sanitizeInt } from "./query.util";
import { SortOptions } from "./sort-options.enum";

export class SafeQueryOptions {
    readonly ascend?: boolean;
    readonly baseOnly?: boolean;
    readonly filter?: string;
    readonly limit: number;
    readonly page: number;
    readonly sort?: SortOptions;

    constructor(init?: Partial<SafeQueryOptions>) {
        init = init || {};
        this.ascend = safeBoolean(init.ascend);
        this.baseOnly = safeBoolean(init.baseOnly) ?? true;
        this.filter = safeAlphaNumeric(init.filter);
        this.limit = sanitizeInt(init.limit, 25);
        this.page = sanitizeInt(init.page, 1);
        this.sort = safeSort(init.sort);
    }
}