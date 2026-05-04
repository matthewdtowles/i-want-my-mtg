import { Inject, Injectable } from '@nestjs/common';
import { ApiUsage } from './api-usage.entity';
import { ApiUsageRepositoryPort } from './ports/api-usage.repository.port';

@Injectable()
export class ApiUsageService {
    constructor(
        @Inject(ApiUsageRepositoryPort) private readonly repository: ApiUsageRepositoryPort
    ) {}

    incrementCount(userId: number, day: Date): Promise<number> {
        return this.repository.incrementCount(userId, day);
    }

    getCount(userId: number, day: Date): Promise<number> {
        return this.repository.getCount(userId, day);
    }

    getRange(userId: number, fromDay: Date, toDay: Date): Promise<ApiUsage[]> {
        return this.repository.getRange(userId, fromDay, toDay);
    }
}
