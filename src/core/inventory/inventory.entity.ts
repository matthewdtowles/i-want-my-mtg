import { User } from "src/core/user/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Card } from "../card/card.entity";

@Entity()
export class Inventory {
    @PrimaryColumn()
    cardId: number;

    @PrimaryColumn()
    userId: number;

    @Column({ default: 1 })
    quantity: number;

    @ManyToOne(() => Card)
    @JoinColumn({
        name: "cardId",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Inventory_Card",
    })
    card: Card;

    @ManyToOne(() => User)
    @JoinColumn({
        name: "userId",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Inventory_User",
    })
    user: User;
}
