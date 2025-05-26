import { User } from "src/core/user/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Card } from "../card/card.entity";

@Entity()
export class Inventory {
    @PrimaryColumn({ name: "card_id" })
    cardId: number;

    @PrimaryColumn({ name: "user_id" })
    userId: number;

    @PrimaryColumn({ name: "foil", type: "boolean" })
    isFoil: boolean;

    @Column({ type: "int", default: 1 })
    quantity: number;

    @ManyToOne(() => Card, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "card_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Inventory_Card",
    })
    card: Card;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "user_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Inventory_User",
    })
    user: User;
}
