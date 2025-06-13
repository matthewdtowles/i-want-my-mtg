import { CardRarity } from "src/core/card";
import { PriceOrmEntity } from "src/infrastructure/database/price";
import { SetOrmEntity } from "src/infrastructure/database/set";
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryColumn
} from "typeorm";
import { LegalityOrmEntity } from "./legality.orm-entity";

@Entity("card")
export class CardOrmEntity {

    @PrimaryColumn({ name: "uuid", unique: true })
    id: string;

    @Column({ nullable: true })
    artist?: string;

    @Column({ name: "has_foil" })
    hasFoil: boolean;

    @Column({ name: "has_non_foil" })
    hasNonFoil: boolean;

    @Column({ name: "img_src" })
    imgSrc: string;

    @Column({ default: false, name: "is_reserved" })
    isReserved: boolean;

    @OneToMany(() => LegalityOrmEntity, legality => legality.card, { cascade: true })
    legalities: LegalityOrmEntity[];

    @Column({ name: "mana_cost", nullable: true })
    manaCost?: string;

    @Column()
    name: string;

    @Column()
    number: string;

    @Column({ name: "oracle_text", nullable: true, type: "text" })
    oracleText?: string;

    @Column({ type: 'integer', generated: 'increment' })
    order: number;

    @OneToMany(() => PriceOrmEntity, (price) => price.card, { cascade: true })
    prices: PriceOrmEntity[];

    @Column({
        type: "enum",
        enum: CardRarity,
        enumName: "card_rarity_enum",
    })
    rarity: CardRarity;

    @ManyToOne(() => SetOrmEntity, (set) => set.cards)
    @JoinColumn({ name: "set_code", referencedColumnName: "code" })
    set: SetOrmEntity;

    @Column({ name: "set_code" })
    setCode: string;

    @Column()
    type: string;
}
