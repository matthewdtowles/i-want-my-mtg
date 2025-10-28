import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { Repository } from "typeorm";
import { SelectQueryBuilder } from "typeorm/query-builder/SelectQueryBuilder";

export abstract class BaseRepository<T> {

    readonly ASC = "ASC";
    readonly DESC = "DESC";
    readonly NULLS_LAST = "NULLS LAST";

    protected repository!: Repository<T>;
    protected abstract readonly TABLE: string;

    protected addFilters(qb: SelectQueryBuilder<T>, filter?: string) {
        if (filter) {
            const filterCol = this.TABLE === "inventory" ? "card.name" : `${this.TABLE}.name`;
            filter
                .split(" ")
                .filter(f => f.length > 0)
                .forEach((fragment, i) =>
                    qb.andWhere(
                        `${filterCol} ILIKE :fragment${i}`,
                        { [`fragment${i}`]: `%${fragment}%` }
                    )
                );
        }
    }

    protected addPagination(qb: SelectQueryBuilder<T>, options: SafeQueryOptions) {
        qb.skip((options.page - 1) * options.limit)
            .take(options.limit);
    }

    protected addOrdering(qb: SelectQueryBuilder<T>, options: SafeQueryOptions, defaultSort: SortOptions, desc?: boolean) {
        if (!options.sort)
            return qb.orderBy(defaultSort, desc ? this.DESC : this.ASC, this.NULLS_LAST);
        const alias = "coalesced_prices";
        const direction = options.ascend ? this.ASC : this.DESC;
        if (options.sort === SortOptions.PRICE)
            qb.addSelect(`COALESCE(${SortOptions.PRICE}, ${SortOptions.PRICE_FOIL})`, alias)
                .orderBy(alias, direction, this.NULLS_LAST);
        else if (options.sort === SortOptions.PRICE_FOIL)
            qb.addSelect(`COALESCE(${SortOptions.PRICE_FOIL}, ${SortOptions.PRICE})`, alias)
                .orderBy(alias, direction, this.NULLS_LAST);
        else qb.orderBy(`${options.sort}`, direction, this.NULLS_LAST);
    }

    protected async totalCards(): Promise<number> {
        const result = await this.repository.query(`SELECT COUNT(*) AS total FROM card`);
        return Number(result[0]?.total ?? 0);
    }

}