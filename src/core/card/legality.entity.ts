import { Card } from "src/core/card/card.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Format, LegalityStatus } from "../card/api/legality.dto";

@Entity()
export class Legality {

    @PrimaryColumn()
    cardId: number;

    @PrimaryColumn({
        type: "enum",
        enum: Format,
    })
    format: string;

    @Column({
        type: "enum",
        enum: LegalityStatus,
    })
    status: string;

    @ManyToOne(() => Card, { onDelete: "CASCADE" })
    @JoinColumn({ name: "cardId", referencedColumnName: "id" })
    card?: Card;
}