import { User } from "src/core/user/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Card } from "../card/card.entity";

@Entity()
export class Inventory {
    @PrimaryColumn()
    cardId: number;

    @PrimaryColumn()
    userId: number;

    @Column({ type: "int", default: 1 })
    quantity: number;

    @ManyToOne(() => Card, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "cardId",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Inventory_Card",
    })
    card: Card;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "userId",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Inventory_User",
    })
    user: User;
}
