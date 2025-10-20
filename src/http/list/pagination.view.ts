import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { buildQueryString } from "src/http/base/http.util";

export class PaginationView {
    readonly current: number;
    readonly total: number;
    readonly baseUrl: string;
    readonly limit: number;
    readonly previous?: PaginationLink;
    readonly first?: PaginationLink;
    readonly next?: PaginationLink;
    readonly last?: PaginationLink;
    readonly skipBack?: PaginationLink;
    readonly skipForward?: PaginationLink;

    constructor(options: SafeQueryOptions, baseUrl: string, totalItems: number) {
        this.current = options.page;
        this.limit = options.limit;
        this.total = Math.ceil(totalItems / this.limit);
        this.baseUrl = baseUrl;
        this.previous = this.buildPrevious(options);
        this.first = this.buildFirst(options);
        this.skipBack = this.buildSkipBack(options);
        this.next = this.buildNext(options);
        this.skipForward = this.buildSkipForward(options);
        this.last = this.buildLast(options);
    }

    private buildPrevious(options: SafeQueryOptions): PaginationLink | undefined {
        return this.hasPreviousPage() ?
            new PaginationLink(`${this.baseUrl}${buildQueryString({
                ...options,
                page: this.current - 1
            })}`, "<")
            : undefined;
    }

    private buildFirst(options: SafeQueryOptions): PaginationLink | undefined {
        return this.hasPreviousPage() ?
            new PaginationLink(`${this.baseUrl}${buildQueryString({
                ...options,
                page: 1
            })}`, "1")
            : undefined;
    }

    private buildNext(options: SafeQueryOptions): PaginationLink | undefined {
        return this.hasNextPage() ?
            new PaginationLink(`${this.baseUrl}${buildQueryString({
                ...options,
                page: this.current + 1
            })}`, ">")
            : undefined;
    }

    private buildLast(options: SafeQueryOptions): PaginationLink | undefined {
        return this.hasNextPage() ?
            new PaginationLink(`${this.baseUrl}${buildQueryString({
                ...options,
                page: this.total
            })}`, String(this.total))
            : undefined;
    }

    private buildSkipBack(options: SafeQueryOptions): PaginationLink | undefined {
        const skipBackValue = this.current - Math.floor(this.total / 3);
        return skipBackValue > 1 && skipBackValue < this.current ?
            new PaginationLink(`${this.baseUrl}${buildQueryString({
                ...options,
                page: skipBackValue
            })}`, String(skipBackValue))
            : undefined;
    }

    private buildSkipForward(options: SafeQueryOptions): PaginationLink | undefined {
        const skipForwardValue = this.current + Math.floor(this.total / 3);
        return skipForwardValue < this.total && skipForwardValue > this.current ?
            new PaginationLink(`${this.baseUrl}${buildQueryString({
                ...options,
                page: skipForwardValue
            })}`, String(skipForwardValue))
            : undefined;
    }

    private hasPreviousPage(): boolean {
        return this.current > 1;
    }

    private hasNextPage(): boolean {
        return this.current < this.total;
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