import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('price_alert')
export class PriceAlertOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'card_id', type: 'varchar' })
    cardId: string;

    @Column({ name: 'increase_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
    increasePct: number | null;

    @Column({ name: 'decrease_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
    decreasePct: number | null;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'last_notified_at', type: 'timestamptz', nullable: true })
    lastNotifiedAt: Date | null;

    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
    updatedAt: Date;
}
