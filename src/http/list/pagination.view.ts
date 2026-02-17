import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { buildQueryString } from 'src/http/base/http.util';

export class PaginationView {
    readonly current: number;
    readonly totalPages: number;
    readonly baseUrl: string;
    readonly limit: number;
    readonly previous?: PaginationLink;
    readonly first?: PaginationLink;
    readonly next?: PaginationLink;
    readonly last?: PaginationLink;
    readonly skipBack?: PaginationLink;
    readonly skipForward?: PaginationLink;
    constructor(
        options: SafeQueryOptions,
        baseUrl: string,
        totalItems: number,
    ) {
        this.current = options.page;
        this.limit = options.limit;
        this.totalPages = Math.ceil(totalItems / this.limit);
        this.baseUrl = baseUrl;
        this.previous = this.buildPrevious(options);
        this.first = this.buildFirst(options);
        this.skipBack = this.buildSkipBack(options);
        this.next = this.buildNext(options);
        this.skipForward = this.buildSkipForward(options);
        this.last = this.buildLast(options);
    }

    private buildLink(options: SafeQueryOptions, page: number): string {
        return `${this.baseUrl}${buildQueryString({ ...options, page })}`;
    }

    private buildPrevious(options: SafeQueryOptions): PaginationLink | undefined {
        return this.hasPreviousPage()
            ? new PaginationLink(this.buildLink(options, this.current - 1), '<')
            : undefined;
    }

    private buildFirst(options: SafeQueryOptions): PaginationLink | undefined {
        return this.hasPreviousPage()
            ? new PaginationLink(this.buildLink(options, 1), '1')
            : undefined;
    }

    private buildNext(options: SafeQueryOptions): PaginationLink | undefined {
        return this.hasNextPage()
            ? new PaginationLink(this.buildLink(options, this.current + 1), '>')
            : undefined;
    }

    private buildLast(options: SafeQueryOptions): PaginationLink | undefined {
        return this.hasNextPage()
            ? new PaginationLink(this.buildLink(options, this.totalPages), String(this.totalPages))
            : undefined;
    }

    private buildSkipBack(options: SafeQueryOptions): PaginationLink | undefined {
        const skipBackValue = this.current - Math.floor(this.totalPages / 3);
        return skipBackValue > 1 && skipBackValue < this.current
            ? new PaginationLink(this.buildLink(options, skipBackValue), String(skipBackValue))
            : undefined;
    }

    private buildSkipForward(options: SafeQueryOptions): PaginationLink | undefined {
        const skipForwardValue = this.current + Math.floor(this.totalPages / 3);
        return skipForwardValue < this.totalPages && skipForwardValue > this.current
            ? new PaginationLink(
                  this.buildLink(options, skipForwardValue),
                  String(skipForwardValue)
              )
            : undefined;
    }

    private hasPreviousPage(): boolean {
        return this.current > 1;
    }

    private hasNextPage(): boolean {
        return this.current < this.totalPages;
    }
}

export class PaginationLink {
    readonly href: string;
    readonly text: string;

    constructor(href: string, text: string) {
        this.href = href;
        this.text = text;
    }
}
