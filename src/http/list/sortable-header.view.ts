import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptionLabels, SortOptions } from 'src/core/query/sort-options.enum';
import { buildQueryString } from 'src/http/base/http.util';
import { TableHeaderView } from './table-header.view';

export class SortableHeaderView extends TableHeaderView {
    readonly href: string;
    readonly ascend?: boolean;

    constructor(options: SafeQueryOptions, sortOption: SortOptions, classes?: string[]) {
        super(SortOptionLabels[sortOption], classes);
        this.ascend = options.sort === sortOption ? !options.ascend : true;
        this.href = buildQueryString({ ...options, sort: sortOption, ascend: this.ascend });
    }
}
