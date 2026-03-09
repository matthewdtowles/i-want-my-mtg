import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { UserOrmEntity } from 'src/database/user/user.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('portfolio_card_performance')
@Unique(['userId', 'cardId', 'isFoil'])
export class PortfolioCardPerformanceOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'card_id' })
    cardId: string;

    @Column({ name: 'is_foil', type: 'boolean' })
    isFoil: boolean;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2 })
    totalCost: number;

    @Column({ name: 'average_cost', type: 'decimal', precision: 10, scale: 2 })
    averageCost: number;

    @Column({ name: 'current_value', type: 'decimal', precision: 10, scale: 2 })
    currentValue: number;

    @Column({ name: 'unrealized_gain', type: 'decimal', precision: 10, scale: 2 })
    unrealizedGain: number;

    @Column({ name: 'realized_gain', type: 'decimal', precision: 10, scale: 2 })
    realizedGain: number;

    @Column({ name: 'roi_percent', type: 'decimal', precision: 8, scale: 2, nullable: true })
    roiPercent: number | null;

    @Column({ name: 'computed_at', type: 'timestamptz', default: () => 'NOW()' })
    computedAt: Date;

    @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'user_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_portfolio_card_performance_user',
    })
    user: UserOrmEntity;

    @ManyToOne(() => CardOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'card_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_portfolio_card_performance_card',
    })
    card: CardOrmEntity;
}
