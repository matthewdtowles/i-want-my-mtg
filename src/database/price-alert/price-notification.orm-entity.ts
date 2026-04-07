import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('price_notification')
export class PriceNotificationOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'card_id', type: 'varchar' })
    cardId: string;

    @Column({ name: 'alert_id', nullable: true })
    alertId: number | null;

    @Column({ type: 'varchar', length: 8 })
    direction: string;

    @Column({ name: 'old_price', type: 'numeric', precision: 10, scale: 2 })
    oldPrice: number;

    @Column({ name: 'new_price', type: 'numeric', precision: 10, scale: 2 })
    newPrice: number;

    @Column({ name: 'change_pct', type: 'numeric', precision: 5, scale: 2 })
    changePct: number;

    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
    createdAt: Date;
}
