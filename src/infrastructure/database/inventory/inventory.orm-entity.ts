import { CardOrmEntity } from "src/infrastructure/database/card/card.orm-entity";
import { UserOrmEntity } from "src/infrastructure/database/user/user.orm-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity("inventory")
export class InventoryOrmEntity {
    @PrimaryColumn({ name: "card_id" })
    cardId: string

    @PrimaryColumn({ name: "user_id" })
    userId: number;

    @PrimaryColumn({ name: "foil", type: "boolean" })
    isFoil: boolean;

    @Column({ type: "int", default: 1 })
    quantity: number;

    @ManyToOne(() => CardOrmEntity, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "card_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Inventory_Card",
    })
    card: CardOrmEntity;

    @ManyToOne(() => UserOrmEntity, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "user_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Inventory_User",
    })
    user: UserOrmEntity;
}
