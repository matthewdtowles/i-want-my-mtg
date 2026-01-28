import { FilterView } from 'src/http/list/filter.view';
import { PaginationView } from 'src/http/list/pagination.view';
import { TableHeadersRowView } from 'src/http/list/table-headers-row.view';
import { CardResponseDto } from './card.response.dto';
import { SingleCardResponseDto } from './single-card.response.dto';
import { ListView } from 'src/http/list/list.view';

export class CardViewDto extends ListView {
    readonly card: SingleCardResponseDto;
    readonly otherPrintings: CardResponseDto[];
    readonly pagination?: PaginationView;
    readonly filter?: FilterView;
    readonly tableHeadersRow: TableHeadersRowView;

    constructor(init: Partial<CardViewDto>) {
        super(init);
        this.card = init.card;
        this.otherPrintings = init.otherPrintings || [];
        this.pagination = init.pagination;
        this.filter = init.filter;
        this.tableHeadersRow = init.tableHeadersRow;
    }
}
