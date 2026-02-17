import { safeSearchTerm } from './query.util';
import { RawQueryOptions, SafeQueryOptions } from './safe-query-options.dto';

export class SearchQueryOptions extends SafeQueryOptions {
    readonly q?: string;

    constructor(init?: RawQueryOptions) {
        super(init);
        this.q = safeSearchTerm(init?.q);
    }
}
