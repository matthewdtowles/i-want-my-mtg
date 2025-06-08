import { CardOrmEntity } from "src/infrastructure/database/card/card.orm-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("price")
export class PriceOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', nullable: true })
    foil: number | null;

    @Column({ type: 'decimal', nullable: true })
    normal: number | null;

    @Column({ type: "date" })
    date: Date;

    @ManyToOne(() => CardOrmEntity, (card) => card.prices, { onDelete: "CASCADE" })
    @JoinColumn({ name: "card_id" })
    card: CardOrmEntity;
}
