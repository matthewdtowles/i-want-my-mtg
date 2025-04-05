import { Format } from "src/core/card/api/format.enum";
import { LegalityStatus } from "src/core/card/api/legality.status.enum";
import { Card } from "src/core/card/card.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity()
export class Legality {

    @PrimaryColumn()
    cardId: number;

    @PrimaryColumn({
        type: "enum",
        enum: Format,
        enumName: "format_enum",
    })
    format: Format;

    @Column({
        type: "enum",
        enum: LegalityStatus,
        enumName: "legality_status_enum",
    })
    status: LegalityStatus;

    @ManyToOne(() => Card, { onDelete: "CASCADE" })
    @JoinColumn({ name: "cardId", referencedColumnName: "id" })
    card?: Card;
}