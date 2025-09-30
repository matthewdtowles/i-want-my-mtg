export class PaginationDto {
    readonly currentPage: number;
    readonly totalPages: number;
    readonly totalItems: number;
    readonly hasPrevPage: boolean;
    readonly hasNextPage: boolean;
    readonly prevPage?: number;
    readonly nextPage?: number;
    readonly prevPages: number[];
    readonly nextPages: number[];

    constructor(currentPage: number, totalItems: number, itemsPerPage: number) {
        console.log('Init pagination DTO, totalItems:', totalItems, 'itemsPerPage:', itemsPerPage);
        this.currentPage = currentPage;
        this.totalItems = totalItems;
        this.totalPages = Math.ceil(totalItems / itemsPerPage);
        console.log('Total pages calculated:', this.totalPages);
        this.hasPrevPage = currentPage > 1;
        this.hasNextPage = currentPage < this.totalPages;
        this.prevPage = this.hasPrevPage ? currentPage - 1 : undefined;
        this.nextPage = this.hasNextPage ? currentPage + 1 : undefined;

        this.prevPages = [];
        for (let i = Math.max(1, currentPage - 2); i < currentPage; i++) {
            this.prevPages.push(i);
        }

        this.nextPages = [];
        for (let i = currentPage + 1; i <= Math.min(this.totalPages, currentPage + 2); i++) {
            this.nextPages.push(i);
        }
    }
}
