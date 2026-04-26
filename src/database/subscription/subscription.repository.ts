import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionRepositoryPort } from 'src/core/billing/ports/subscription.repository.port';
import { Subscription } from 'src/core/billing/subscription.entity';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { SubscriptionMapper } from './subscription.mapper';
import { SubscriptionOrmEntity } from './subscription.orm-entity';

@Injectable()
export class SubscriptionRepository implements SubscriptionRepositoryPort {
    private readonly LOGGER = getLogger(SubscriptionRepository.name);

    constructor(
        @InjectRepository(SubscriptionOrmEntity)
        private readonly repository: Repository<SubscriptionOrmEntity>
    ) {}

    async findByUserId(userId: number): Promise<Subscription | null> {
        const found = await this.repository.findOneBy({ userId });
        return found ? SubscriptionMapper.toCore(found) : null;
    }

    async findByStripeCustomerId(customerId: string): Promise<Subscription | null> {
        const found = await this.repository.findOneBy({ stripeCustomerId: customerId });
        return found ? SubscriptionMapper.toCore(found) : null;
    }

    async findByStripeSubscriptionId(subscriptionId: string): Promise<Subscription | null> {
        const found = await this.repository.findOneBy({
            stripeSubscriptionId: subscriptionId,
        });
        return found ? SubscriptionMapper.toCore(found) : null;
    }

    async upsert(subscription: Subscription): Promise<Subscription> {
        const orm = SubscriptionMapper.toOrmEntity(subscription);
        orm.updatedAt = new Date();
        // Real INSERT ... ON CONFLICT (user_id) DO UPDATE so concurrent writers
        // (e.g. two checkout requests racing) don't both see "no row" and then
        // collide on the user_id unique constraint during save().
        const values: Partial<SubscriptionOrmEntity> = { ...orm };
        if (values.id === undefined || values.id === null) delete values.id;
        await this.repository.upsert(values as SubscriptionOrmEntity, {
            conflictPaths: ['userId'],
        });
        const saved = await this.repository.findOneByOrFail({ userId: orm.userId });
        this.LOGGER.debug(
            `Upserted subscription for user ${saved.userId}, status=${saved.status}.`
        );
        return SubscriptionMapper.toCore(saved);
    }

    async deleteByUserId(userId: number): Promise<void> {
        await this.repository.delete({ userId });
    }
}
