import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";

export class FilterView {
    readonly baseUrl: string;
    readonly page: number;
    readonly limit: number;
    readonly searchTerm: string;

    constructor(options: SafeQueryOptions, baseUrl: string) {
        this.baseUrl = baseUrl;
        this.page = options.page;
        this.limit = options.limit;
        this.searchTerm = options.filter;
    }
}