import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Card } from "../card/card.entity";
import { Format, LegalityStatus } from "../card/api/legality.dto";

@Entity()
export class Legality {

    @PrimaryColumn()
    cardId: number;

    @PrimaryColumn({
        type: "enum",
        enum: Format,
    })
    format: string

    @ManyToOne(() => Card, (card) => card.legalities, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "cardId",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Legality_Card",
    })
    card: Card;

    @Column({
        type: "enum",
        enum: LegalityStatus,
    })
    status: string;
}