import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiUsage } from 'src/core/api-tier/api-usage.entity';
import { ApiUsageRepositoryPort } from 'src/core/api-tier/ports/api-usage.repository.port';
import { Between, Repository } from 'typeorm';
import { ApiUsageOrmEntity } from './api-usage.orm-entity';

@Injectable()
export class ApiUsageRepository implements ApiUsageRepositoryPort {
    constructor(
        @InjectRepository(ApiUsageOrmEntity)
        private readonly repository: Repository<ApiUsageOrmEntity>
    ) {}

    async incrementCount(userId: number, day: Date): Promise<number> {
        const dayKey = this.toDayKey(day);
        // Atomic UPSERT + RETURNING; concurrent requests serialize on the (user_id, day) PK.
        const result: Array<{ request_count: number }> = await this.repository.query(
            `INSERT INTO api_usage (user_id, day, request_count)
             VALUES ($1, $2::date, 1)
             ON CONFLICT (user_id, day)
             DO UPDATE SET request_count = api_usage.request_count + 1
             RETURNING request_count`,
            [userId, dayKey]
        );
        return Number(result[0].request_count);
    }

    async getCount(userId: number, day: Date): Promise<number> {
        const found = await this.repository.findOneBy({ userId, day: this.toDayKey(day) as unknown as Date });
        return found?.requestCount ?? 0;
    }

    async getRange(userId: number, fromDay: Date, toDay: Date): Promise<ApiUsage[]> {
        const rows = await this.repository.find({
            where: {
                userId,
                day: Between(this.toDayKey(fromDay) as unknown as Date, this.toDayKey(toDay) as unknown as Date),
            },
            order: { day: 'ASC' },
        });
        return rows.map(
            (r) =>
                new ApiUsage({
                    userId: r.userId,
                    day: r.day instanceof Date ? r.day : new Date(r.day),
                    requestCount: r.requestCount,
                })
        );
    }

    private toDayKey(d: Date): string {
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
}
