import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SelectQueryBuilder } from "typeorm/query-builder/SelectQueryBuilder";

export abstract class BaseRepository<T> {

    readonly ASC = "ASC";
    readonly DESC = "DESC";
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

    protected paginate(qb: SelectQueryBuilder<T>, options: SafeQueryOptions) {
        qb.skip((options.page - 1) * options.limit)
            .take(options.limit);
    }
}