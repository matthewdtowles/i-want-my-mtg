import { Card } from "src/core/card/card.entity";
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Price {

    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Card, (card) => card.price, { cascade: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "cardId", referencedColumnName: "id" })
    card: Card;

    @Column()
    foil: number;

    @Column()
    normal: number;

    @Column({ type: "date" })
    lastUpdatedAt: Date;
}
