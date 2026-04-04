import { PriceAlert } from '../price-alert.entity';

export const PriceAlertRepositoryPort = 'PriceAlertRepositoryPort';

export interface AlertWithPriceData {
    alert: PriceAlert;
    cardName: string;
    setCode: string;
    currentPrice: number | null;
    previousPrice: number | null;
}

export interface PriceAlertRepositoryPort {
    create(alert: PriceAlert): Promise<PriceAlert>;
    findById(id: number): Promise<PriceAlert | null>;
    findByUserAndCard(userId: number, cardId: string): Promise<PriceAlert | null>;
    findByUser(userId: number, page: number, limit: number): Promise<PriceAlert[]>;
    countByUser(userId: number): Promise<number>;
    findActiveWithPriceData(): Promise<AlertWithPriceData[]>;
    update(alert: PriceAlert): Promise<PriceAlert>;
    delete(id: number): Promise<void>;
    updateLastNotifiedAt(ids: number[], date: Date): Promise<void>;
}
