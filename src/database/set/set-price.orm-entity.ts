import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { SetOrmEntity } from './set.orm-entity';

@Entity('set_price')
export class SetPriceOrmEntity {
    @PrimaryColumn({ name: 'set_code' })
    setCode: string;

    @Column({ name: 'base_price', type: 'decimal', nullable: true })
    basePrice: number;

    @Column({ name: 'total_price', type: 'decimal', nullable: true })
    totalPrice: number;

    @Column({ name: 'base_price_all', type: 'decimal', nullable: true })
    basePriceAll: number;

    @Column({ name: 'total_price_all', type: 'decimal', nullable: true })
    totalPriceAll: number;

    @Column({ name: 'base_price_change_weekly', type: 'decimal', nullable: true })
    basePriceChangeWeekly: number | null;

    @Column({ name: 'total_price_change_weekly', type: 'decimal', nullable: true })
    totalPriceChangeWeekly: number | null;

    @Column({ name: 'base_price_all_change_weekly', type: 'decimal', nullable: true })
    basePriceAllChangeWeekly: number | null;

    @Column({ name: 'total_price_all_change_weekly', type: 'decimal', nullable: true })
    totalPriceAllChangeWeekly: number | null;

    @Column({ name: 'date', type: 'date' })
    lastUpdate: Date;

    @OneToOne(() => SetOrmEntity, (set) => set.setPrice)
    @JoinColumn({ name: 'set_code' })
    set: SetOrmEntity;
}
