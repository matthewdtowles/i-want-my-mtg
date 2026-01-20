import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";

export class FilterView {
    readonly baseUrl: string;
    readonly limit: number;
    readonly page: number;
    readonly searchTerm: string;

    constructor(options: SafeQueryOptions, baseUrl: string) {
        this.baseUrl = baseUrl;
        this.limit = options.limit;
        this.page = options.page;
        this.searchTerm = options.filter;
    }
}