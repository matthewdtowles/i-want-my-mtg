import { SetPriceHistory } from './set-price-history.entity';

export const SetPriceHistoryRepositoryPort = 'SetPriceHistoryRepositoryPort';

export interface SetPriceHistoryRepositoryPort {
    findBySetCode(setCode: string, days?: number): Promise<SetPriceHistory[]>;
}
