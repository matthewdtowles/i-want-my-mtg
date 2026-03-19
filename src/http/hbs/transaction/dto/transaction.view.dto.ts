import { BaseViewDto } from 'src/http/base/base.view.dto';
import { FilterView } from 'src/http/hbs/list/filter.view';
import { PaginationView } from 'src/http/hbs/list/pagination.view';
import { TableHeadersRowView } from 'src/http/hbs/list/table-headers-row.view';
import { TransactionResponseDto } from './transaction.response.dto';

export class TransactionViewDto extends BaseViewDto {
    readonly transactions: TransactionResponseDto[];
    readonly username: string;
    readonly totalTransactions: number;
    readonly hasTransactions: boolean;
    readonly filter?: FilterView;
    readonly pagination?: PaginationView;
    readonly tableHeadersRow?: TableHeadersRowView;

    constructor(init: Partial<TransactionViewDto>) {
        super(init);
        this.transactions = init.transactions || [];
        this.username = init.username || '';
        this.totalTransactions = init.totalTransactions || 0;
        this.hasTransactions = init.hasTransactions || false;
        this.filter = init.filter;
        this.pagination = init.pagination;
        this.tableHeadersRow = init.tableHeadersRow;
    }
}
