import { SetOrmEntity } from 'src/database/set/set.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('set_price_history')
@Unique(['set', 'date'])
export class SetPriceHistoryOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'base_price', type: 'decimal', nullable: true })
    basePrice: number | null;

    @Column({ name: 'total_price', type: 'decimal', nullable: true })
    totalPrice: number | null;

    @Column({ name: 'base_price_all', type: 'decimal', nullable: true })
    basePriceAll: number | null;

    @Column({ name: 'total_price_all', type: 'decimal', nullable: true })
    totalPriceAll: number | null;

    @Column({ type: 'date' })
    date: Date;

    @ManyToOne(() => SetOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'set_code' })
    set: SetOrmEntity;
}
