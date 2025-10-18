import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { buildQueryString } from "src/http/base/http.util";

export class SortableHeaderView {
    readonly href: string;
    readonly text: string;
    readonly ascend?: boolean;

    constructor(options: SafeQueryOptions, text: string) {
        this.href = buildQueryString(options);
        this.text = text;
        this.ascend = options.ascend;
    }
}