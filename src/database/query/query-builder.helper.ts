import { SelectQueryBuilder } from 'typeorm';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';

export interface QueryBuilderConfig {
    table: string;
    filterColumn?: string; // defaults to `${table}.name`
    defaultSort: SortOptions;
    defaultSortDesc?: boolean;
    customSortHandlers?: Map<SortOptions, (qb: SelectQueryBuilder<any>, direction: 'ASC' | 'DESC') => void>;
}

export class QueryBuilderHelper<T> {
    private static readonly ASC = 'ASC';
    private static readonly DESC = 'DESC';
    private static readonly NULLS_LAST = 'NULLS LAST';

    constructor(private readonly config: QueryBuilderConfig) {}

    /**
     * Applies all standard query options in a consistent order.
     * Returns the query builder for chaining.
     */
    applyOptions(qb: SelectQueryBuilder<T>, options: SafeQueryOptions): SelectQueryBuilder<T> {
        this.applyFilters(qb, options.filter);
        this.applyPagination(qb, options);
        this.applyOrdering(qb, options);
        return qb;
    }

    applyFilters(qb: SelectQueryBuilder<T>, filter?: string): void {
        if (!filter) return;
        
        const filterCol = this.config.filterColumn ?? `${this.config.table}.name`;
        filter
            .split(' ')
            .filter((f) => f.length > 0)
            .forEach((fragment, i) =>
                qb.andWhere(`${filterCol} ILIKE :fragment${i}`, {
                    [`fragment${i}`]: `%${fragment}%`,
                })
            );
    }

    applyPagination(qb: SelectQueryBuilder<T>, options: SafeQueryOptions): void {
        qb.skip((options.page - 1) * options.limit).take(options.limit);
    }

    applyOrdering(qb: SelectQueryBuilder<T>, options: SafeQueryOptions): void {
        const sort = options.sort ?? this.config.defaultSort;
        const direction = options.ascend 
            ? QueryBuilderHelper.ASC 
            : (options.sort ? QueryBuilderHelper.DESC : (this.config.defaultSortDesc ? QueryBuilderHelper.DESC : QueryBuilderHelper.ASC));

        // Check for custom handler first
        const customHandler = this.config.customSortHandlers?.get(sort);
        if (customHandler) {
            customHandler(qb, direction);
            return;
        }

        // Handle price sorting with COALESCE
        if (sort === SortOptions.PRICE) {
            qb.addSelect(`COALESCE(${SortOptions.PRICE}, ${SortOptions.PRICE_FOIL})`, 'coalesced_price')
              .orderBy('coalesced_price', direction, QueryBuilderHelper.NULLS_LAST);
        } else if (sort === SortOptions.PRICE_FOIL) {
            qb.addSelect(`COALESCE(${SortOptions.PRICE_FOIL}, ${SortOptions.PRICE})`, 'coalesced_price')
              .orderBy('coalesced_price', direction, QueryBuilderHelper.NULLS_LAST);
        } else {
            qb.orderBy(sort, direction, QueryBuilderHelper.NULLS_LAST);
        }
    }
}