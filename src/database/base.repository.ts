import { BaseRepositoryPort } from 'src/core/base.repository.port';
import { Repository } from 'typeorm';

export abstract class BaseRepository<T> implements BaseRepositoryPort {
    protected readonly ASC = 'ASC';
    protected readonly DESC = 'DESC';
    protected readonly NULLS_LAST = 'NULLS LAST';

    protected repository!: Repository<T>;
    protected abstract readonly TABLE: string;

    async totalCards(): Promise<number> {
        const result = await this.repository.query(`SELECT COUNT(*) AS total FROM card`);
        return Number(result[0]?.total ?? 0);
    }

    async totalCardsInSet(setCode: string): Promise<number> {
        const result = await this.repository.query(
            `SELECT COUNT(*) AS total_cards FROM card WHERE set_code = $1`,
            [setCode]
        );
        return Number(result[0]?.total_cards ?? 0);
    }
}
