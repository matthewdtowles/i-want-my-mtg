import { UserOrmEntity } from 'src/database/user/user.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('portfolio_value_history')
@Unique(['user', 'date'])
export class PortfolioValueHistoryOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'total_value', type: 'decimal', precision: 12, scale: 2 })
    totalValue: number;

    @Column({ name: 'total_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
    totalCost: number | null;

    @Column({ name: 'total_cards', type: 'int' })
    totalCards: number;

    @Column({ type: 'date' })
    date: Date;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'user_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_portfolio_value_history_user',
    })
    user: UserOrmEntity;
}
