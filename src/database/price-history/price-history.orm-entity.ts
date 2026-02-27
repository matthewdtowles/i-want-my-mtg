import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('price_history')
@Unique(['card', 'date'])
export class PriceHistoryOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', nullable: true })
    foil: number | null;

    @Column({ type: 'decimal', nullable: true })
    normal: number | null;

    @Column({ type: 'date' })
    date: Date;

    @ManyToOne(() => CardOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'card_id' })
    card: CardOrmEntity;
}
