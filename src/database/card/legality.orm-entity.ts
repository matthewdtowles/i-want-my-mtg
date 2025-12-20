import { Format } from "src/core/card/format.enum";
import { LegalityStatus } from "src/core/card/legality.status.enum";
import { CardOrmEntity } from "./card.orm-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity("legality")
export class LegalityOrmEntity {

    @PrimaryColumn({ name: "card_id" })
        cardId: string;

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

    @ManyToOne(() => CardOrmEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "card_id", referencedColumnName: "id" })
        card?: CardOrmEntity;
}