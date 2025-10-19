import { TableHeaderView } from "./table-header.view";

// Track which sortable header is active
export class TableHeadersRowView {
    readonly headers: TableHeaderView[];

    constructor(headers: TableHeaderView[]) {
        this.headers = headers;
        // Ensure max of one header in headers has ascend true
    }
}