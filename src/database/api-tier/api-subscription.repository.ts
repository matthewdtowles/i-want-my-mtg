import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiSubscription } from 'src/core/api-tier/api-subscription.entity';
import { ApiSubscriptionRepositoryPort } from 'src/core/api-tier/ports/api-subscription.repository.port';
import { Repository } from 'typeorm';
import { ApiSubscriptionMapper } from './api-subscription.mapper';
import { ApiSubscriptionOrmEntity } from './api-subscription.orm-entity';

@Injectable()
export class ApiSubscriptionRepository implements ApiSubscriptionRepositoryPort {
    constructor(
        @InjectRepository(ApiSubscriptionOrmEntity)
        private readonly repository: Repository<ApiSubscriptionOrmEntity>
    ) {}

    async findByUserId(userId: number): Promise<ApiSubscription | null> {
        const found = await this.repository.findOneBy({ userId });
        return found ? ApiSubscriptionMapper.toCore(found) : null;
    }

    async findByStripeCustomerId(customerId: string): Promise<ApiSubscription | null> {
        const found = await this.repository.findOneBy({ stripeCustomerId: customerId });
        return found ? ApiSubscriptionMapper.toCore(found) : null;
    }

    async findByStripeSubscriptionId(subscriptionId: string): Promise<ApiSubscription | null> {
        const found = await this.repository.findOneBy({ stripeSubscriptionId: subscriptionId });
        return found ? ApiSubscriptionMapper.toCore(found) : null;
    }

    async upsert(subscription: ApiSubscription): Promise<ApiSubscription> {
        const orm = ApiSubscriptionMapper.toOrmEntity(subscription);
        orm.updatedAt = new Date();
        const values: Partial<ApiSubscriptionOrmEntity> = { ...orm };
        if (values.id === undefined || values.id === null) delete values.id;
        await this.repository.upsert(values as ApiSubscriptionOrmEntity, {
            conflictPaths: ['userId'],
        });
        const saved = await this.repository.findOneByOrFail({ userId: orm.userId });
        return ApiSubscriptionMapper.toCore(saved);
    }

    async deleteByUserId(userId: number): Promise<void> {
        await this.repository.delete({ userId });
    }
}
