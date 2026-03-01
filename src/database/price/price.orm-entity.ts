import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('price')
@Unique(['card', 'date'])
export class PriceOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', nullable: true })
    foil: number | null;

    @Column({ type: 'decimal', nullable: true })
    normal: number | null;

    @Column({ name: 'normal_change_weekly', type: 'decimal', nullable: true })
    normalChangeWeekly: number | null;

    @Column({ name: 'foil_change_weekly', type: 'decimal', nullable: true })
    foilChangeWeekly: number | null;

    @Column({ type: 'date' })
    date: Date;

    @ManyToOne(() => CardOrmEntity, (card) => card.prices, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'card_id' })
    card: CardOrmEntity;
}
