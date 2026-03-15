import { BaseViewDto } from 'src/http/base/base.view.dto';
import { FilterView } from './filter.view';
import { PaginationView } from './pagination.view';
import { TableHeadersRowView } from './table-headers-row.view';
import { BaseOnlyToggleView } from './base-only-toggle.view';

export class ListView extends BaseViewDto {
    readonly baseOnlyToggle?: BaseOnlyToggleView;
    readonly filter?: FilterView;
    readonly pagination?: PaginationView;
    readonly tableHeadersRow: TableHeadersRowView;

    constructor(init: Partial<ListView>) {
        super(init);
        this.baseOnlyToggle = init.baseOnlyToggle;
        this.filter = init.filter;
        this.pagination = init.pagination;
        this.tableHeadersRow = init.tableHeadersRow;
    }
}
