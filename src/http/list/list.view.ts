import { BaseViewDto } from "src/http/base/base.view.dto";
import { FilterView } from "./filter.view";
import { PaginationView } from "./pagination.view";
import { SortableHeaderView } from "./sortable-header.view";

export class ListView extends BaseViewDto {
    readonly pagination?: PaginationView;
    readonly filter?: FilterView;
    readonly sortableHeaders?: SortableHeaderView[];

    constructor(init: Partial<ListView>) {
        super(init);
        this.pagination = init.pagination;
        this.filter = init.filter;
        this.sortableHeaders = init.sortableHeaders;
    }
}