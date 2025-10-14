import { safeAlphaNumeric, safeBoolean, sanitizeInt } from "./query.util";
import { SortOptions } from "./sort-options.enum";

export class QueryOptionsDto {
    readonly DEFAULT_PAGE = 1;
    readonly DEFAULT_LIMIT = 25;

    readonly page: number;
    readonly limit: number;
    readonly ascend: boolean;
    readonly filter?: string;
    readonly sort?: SortOptions;

    constructor(init?: Partial<QueryOptionsDto>) {
        console.log("QueryOptionsDto init:", init);
        init = init || {};
        this.page = sanitizeInt(init.page, this.DEFAULT_PAGE);
        this.limit = sanitizeInt(init.limit, this.DEFAULT_LIMIT);
        this.ascend = safeBoolean(init.ascend, false);
        this.filter = safeAlphaNumeric(init.filter);
        this.sort = init.sort;
        console.log("QueryOptionsDto constructed:", this);
    }
}