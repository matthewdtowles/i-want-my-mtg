import { ApiUsage } from '../api-usage.entity';

export const ApiUsageRepositoryPort = 'ApiUsageRepositoryPort';

export interface ApiUsageRepositoryPort {
    /** Atomic UPSERT + increment. Returns the post-increment count for the (user, day). */
    incrementCount(userId: number, day: Date): Promise<number>;
    getCount(userId: number, day: Date): Promise<number>;
    getRange(userId: number, fromDay: Date, toDay: Date): Promise<ApiUsage[]>;
}
