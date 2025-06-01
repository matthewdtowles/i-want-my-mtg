import { Price } from "src/core/price/price.entity";
import { Set } from "src/core/set/set.entity";
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany, PrimaryGeneratedColumn
} from "typeorm";
import { CardRarity } from "./api/card.rarity.enum";
import { Legality } from "./legality.entity";

@Entity()
export class Card {
    @PrimaryGeneratedColumn()
    id: number;

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

    @OneToMany(() => Legality, legality => legality.card, { cascade: true })
    legalities: Legality[];

    @Column({ name: "mana_cost", nullable: true })
    manaCost?: string;

    @Column()
    name: string;

    @Column()
    number: string;

    @Column({ name: "oracle_text", nullable: true, type: "text" })
    oracleText?: string;

    @OneToMany(() => Price, (price) => price.card, { cascade: true })
    prices: Price[];

    @Column({
        type: "enum",
        enum: CardRarity,
        enumName: "card_rarity_enum",
    })
    rarity: CardRarity;

    @ManyToOne(() => Set, (set) => set.cards)
    @JoinColumn({ name: "set_code", referencedColumnName: "code" })
    set: Set;

    @Column({ name: "set_code" })
    setCode: string;

    @Column()
    type: string;

    @Column({ unique: true })
    uuid: string;
}
