import { SortOptions } from "./sort-options.enum";

export class QueryOptionsDto {
    readonly DEFAULT_PAGE = 1;
    readonly DEFAULT_LIMIT = 25;
    readonly DEFAULT_ASCEND = false;

    readonly page: number;
    readonly limit: number;
    readonly ascend: boolean;
    readonly filter?: string;
    readonly sort?: SortOptions;

    constructor(init: Partial<QueryOptionsDto>) {
        this.page = init.page ?? this.DEFAULT_PAGE;
        this.limit = init.limit ?? this.DEFAULT_LIMIT;
        this.ascend = init.ascend ?? this.DEFAULT_ASCEND;
        this.filter = init.filter;
        this.sort = init.sort;
    }
}