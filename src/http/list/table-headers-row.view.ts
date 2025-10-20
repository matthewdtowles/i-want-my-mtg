import { TableHeaderView } from "./table-header.view";

export class TableHeadersRowView {
    readonly headers: TableHeaderView[];

    constructor(headers: TableHeaderView[]) {
        this.headers = headers;
    }
}