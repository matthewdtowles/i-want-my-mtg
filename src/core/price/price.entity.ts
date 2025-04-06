import { Card } from "src/core/card/card.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Price {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', nullable: true })
    foil: number;

    @Column({ type: 'decimal', nullable: true })
    normal: number;

    @Column({ type: "date" })
    date: Date;

    @ManyToOne(() => Card, (card) => card.prices, { onDelete: "CASCADE" })
    @JoinColumn({ name: "cardId" })
    card: Card;
}
