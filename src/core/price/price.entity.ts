import { Card } from "src/core/card/card.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Price {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', nullable: true })
    foil: number | null;

    @Column({ type: 'decimal', nullable: true })
    normal: number | null;

    @Column({ type: "date" })
    date: Date;

    @ManyToOne(() => Card, (card) => card.prices, { onDelete: "CASCADE" })
    @JoinColumn({ name: "card_id" })
    card: Card;
}
