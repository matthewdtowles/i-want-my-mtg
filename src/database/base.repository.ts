import { SelectQueryBuilder } from "typeorm/query-builder/SelectQueryBuilder";

export abstract class BaseRepository<T> {

    readonly ASC = "ASC";
    readonly DESC = "DESC";
    protected readonly FILTER_COL: string = "name";
    protected abstract readonly TABLE: string;

    protected addFilters(qb: SelectQueryBuilder<T>, filter?: string) {
        if (filter) {
            filter
                .split(" ")
                .filter(f => f.length > 0)
                .forEach((fragment, i) =>
                    qb.andWhere(
                        `${this.TABLE}.${this.FILTER_COL} ILIKE :fragment${i}`,
                        { [`fragment${i}`]: `%${fragment}%` }
                    )
                );
        }
    }
}