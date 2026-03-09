import { Price } from '../price.entity';

export const PriceHistoryRepositoryPort = 'PriceHistoryRepositoryPort';

export interface PriceHistoryRepositoryPort {
    findByCardId(cardId: string, days?: number): Promise<Price[]>;
}
