import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('api_subscription')
@Index('idx_api_subscription_status', ['status'])
export class ApiSubscriptionOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id', unique: true })
    userId: number;

    @Column({ default: 'free' })
    tier: string;

    @Column({ name: 'stripe_customer_id', nullable: true, unique: true })
    stripeCustomerId: string | null;

    @Column({ name: 'stripe_subscription_id', nullable: true, unique: true })
    stripeSubscriptionId: string | null;

    @Column({ name: 'stripe_price_id', nullable: true })
    stripePriceId: string | null;

    @Column({ nullable: true })
    status: string | null;

    @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
    currentPeriodEnd: Date | null;

    @Column({ name: 'cancel_at_period_end', default: false })
    cancelAtPeriodEnd: boolean;

    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
    updatedAt: Date;
}
