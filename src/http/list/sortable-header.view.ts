import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { buildQueryString } from "src/http/base/http.util";
import { TableHeaderView } from "./table-header.view";

export class SortableHeaderView extends TableHeaderView {
    readonly href: string;
    readonly ascend?: boolean;

    constructor(options: SafeQueryOptions, text: string, classes?: string[]) {
        super(text, classes);
        this.href = buildQueryString(options);
        this.ascend = options.ascend;
    }
}