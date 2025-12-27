import { safeAlphaNumeric, safeBoolean, safeSort, sanitizeInt } from "./query.util";
import { SortOptions } from "./sort-options.enum";

export class SafeQueryOptions {
    readonly page: number;
    readonly limit: number;
    readonly ascend?: boolean;
    readonly filter?: string;
    readonly sort?: SortOptions;
    readonly baseOnly: boolean;

    constructor(init?: Partial<SafeQueryOptions>) {
        init = init || {};
        this.page = sanitizeInt(init.page, 1);
        this.limit = sanitizeInt(init.limit, 25);
        this.ascend = safeBoolean(init.ascend);
        this.filter = safeAlphaNumeric(init.filter);
        this.sort = safeSort(init.sort);
        this.baseOnly = safeBoolean(init.baseOnly) || true;
    }
}