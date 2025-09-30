export class PaginationDto {
    readonly currentPage: number;
    readonly totalPages: number;
    readonly totalItems: number;
    readonly hasPrevPage: boolean;
    readonly hasNextPage: boolean;
    readonly prevPage?: number;
    readonly nextPage?: number;
    readonly skipBackPage?: number;
    readonly skipForwardPage?: number;

    constructor(currentPage: number, totalItems: number, itemsPerPage: number) {
        this.currentPage = currentPage;
        this.totalItems = totalItems;
        this.totalPages = Math.ceil(totalItems / itemsPerPage);
        this.hasPrevPage = currentPage > 1;
        this.hasNextPage = currentPage < this.totalPages;
        this.prevPage = this.hasPrevPage ? currentPage - 1 : undefined;
        this.nextPage = this.hasNextPage ? currentPage + 1 : undefined;

        const skipAmount: number = Math.floor(this.totalPages / 3);
        this.skipBackPage = this.hasPrevPage && (currentPage - skipAmount) > 1 ? currentPage - skipAmount : undefined;
        this.skipForwardPage = this.hasNextPage && (currentPage + skipAmount) < this.totalPages ? currentPage + skipAmount : undefined;
    }
}
