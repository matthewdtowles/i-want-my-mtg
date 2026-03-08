import { UserOrmEntity } from 'src/database/user/user.orm-entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity('portfolio_summary')
export class PortfolioSummaryOrmEntity {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @Column({ name: 'total_value', type: 'decimal', precision: 12, scale: 2 })
    totalValue: number;

    @Column({ name: 'total_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
    totalCost: number | null;

    @Column({
        name: 'total_realized_gain',
        type: 'decimal',
        precision: 12,
        scale: 2,
        nullable: true,
    })
    totalRealizedGain: number | null;

    @Column({ name: 'total_cards', type: 'int' })
    totalCards: number;

    @Column({ name: 'total_quantity', type: 'int' })
    totalQuantity: number;

    @Column({ name: 'computed_at', type: 'timestamptz', default: () => 'NOW()' })
    computedAt: Date;

    @Column({ name: 'refreshes_today', type: 'int', default: 0 })
    refreshesToday: number;

    @Column({ name: 'last_refresh_date', type: 'date', default: () => 'CURRENT_DATE' })
    lastRefreshDate: Date;

    @Column({ name: 'computation_method', type: 'varchar', length: 10, default: 'average' })
    computationMethod: string;

    @OneToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'user_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_portfolio_summary_user',
    })
    user: UserOrmEntity;
}
