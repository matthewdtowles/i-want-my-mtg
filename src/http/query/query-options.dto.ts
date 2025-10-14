export class QueryOptionsDto {
    readonly page: number;
    readonly limit: number;
    readonly filter?: string;
    readonly sort?: string;
    readonly direction?: "asc" | "desc";

    constructor(init: Partial<QueryOptionsDto>) {
        this.page = init.page ?? 1;
        this.limit = init.limit ?? 25;
        this.filter = init.filter;
        this.sort = init.sort ?? "name";
        this.direction = init.direction ?? "desc";
    }
}