import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';

export class FilterView {
    readonly baseUrl: string;
    readonly page: number;
    readonly limit: number;
    readonly searchTerm: string;
    readonly baseOnly: boolean;
    readonly placeholder: string;

    constructor(options: SafeQueryOptions, baseUrl: string, placeholder: string = 'Filter...') {
        this.baseUrl = baseUrl;
        this.page = options.page;
        this.limit = options.limit;
        this.searchTerm = options.filter || '';
        this.baseOnly = options.baseOnly;
        this.placeholder = placeholder;
    }
}
