import { BaseViewDto } from "src/http/base/base.view.dto";
import { FilterView } from "./filter.view";
import { PaginationView } from "./pagination.view";
import { TableHeadersRowView } from "./table-headers-row.view";

export class ListView extends BaseViewDto {
    readonly filter?: FilterView;
    readonly pagination?: PaginationView;
    readonly tableHeadersRow: TableHeadersRowView;

    constructor(init: Partial<ListView>) {
        super(init);
        this.pagination = init.pagination;
        this.filter = init.filter;
        this.tableHeadersRow = init.tableHeadersRow;
    }
}