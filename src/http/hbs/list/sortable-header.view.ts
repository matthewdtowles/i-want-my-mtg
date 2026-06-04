import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import {
    INVENTORY_SORTS,
    SET_CARD_SORTS,
    SET_SORTS,
    SortOptionLabels,
    SortOptions,
    TRANSACTION_SORTS,
} from 'src/core/query/sort-options.enum';
import { buildQueryString } from 'src/http/base/http.util';
import { TableHeaderView } from './table-header.view';

export class SortableHeaderView extends TableHeaderView {
    readonly href: string;
    readonly ascend?: boolean;

    constructor(
        options: SafeQueryOptions,
        sortOption: SortOptions,
        classes?: string[],
        subtitle?: string
    ) {
        super(SortOptionLabels[sortOption], classes, subtitle);
        this.ascend = options.sort === sortOption ? !options.ascend : true;
        this.href = buildQueryString({ ...options, sort: sortOption, ascend: this.ascend });
    }
}

/**
 * Per-context header factories. Each binds a clickable column's sort key to the
 * honorable sort set its list query honors (the `*_SORTS` constants in
 * sort-options.enum, shared by the repositories and the API validator). A header
 * that offers a sort outside its set fails to compile, so "offered ⊆ honorable"
 * is enforced at build time rather than only happening to hold today.
 */
const headerFactory =
    <T extends SortOptions>() =>
    (
        options: SafeQueryOptions,
        sort: T,
        classes?: string[],
        subtitle?: string
    ): SortableHeaderView =>
        new SortableHeaderView(options, sort, classes, subtitle);

export const setCardSortHeader = headerFactory<(typeof SET_CARD_SORTS)[number]>();
export const setSortHeader = headerFactory<(typeof SET_SORTS)[number]>();
export const inventorySortHeader = headerFactory<(typeof INVENTORY_SORTS)[number]>();
export const transactionSortHeader = headerFactory<(typeof TRANSACTION_SORTS)[number]>();
