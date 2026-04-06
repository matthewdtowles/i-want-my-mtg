import { PriceNotification } from '../price-notification.entity';

export const PriceNotificationRepositoryPort = 'PriceNotificationRepositoryPort';

export interface PriceNotificationRepositoryPort {
    createMany(notifications: PriceNotification[]): Promise<PriceNotification[]>;
    findByUser(userId: number, page: number, limit: number): Promise<PriceNotification[]>;
    countByUser(userId: number): Promise<number>;
    countUnreadByUser(userId: number): Promise<number>;
    markAsRead(id: number, userId: number): Promise<number>;
    markAllAsRead(userId: number): Promise<void>;
}
