import { IsNotEmpty, IsString, IsUUID } from "class-validator";
import { Price } from "src/core/price/price.entity";
import { Set } from "src/core/set/set.entity";
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn
} from "typeorm";
import { CardRarity } from "./api/card.rarity.enum";
import { Legality } from "./legality.entity";

@Entity()
export class Card {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    @IsString()
    artist?: string;

    @Column({ name: "img_src" })
    @IsString()
    @IsNotEmpty()
    imgSrc: string;

    @Column({ default: false, name: "is_reserved" })
    isReserved: boolean;

    @OneToMany(() => Legality, legality => legality.card, { cascade: true })
    legalities: Legality[];

    @Column({ name: "mana_cost", nullable: true })
    manaCost?: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    name: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    number: string;

    @Column({ name: "oracle_text", nullable: true, type: "text" })
    @IsString()
    oracleText?: string;

    @OneToMany(() => Price, (price) => price.card, { cascade: true })
    prices: Price[];

    @Column({
        type: "enum",
        enum: CardRarity,
        enumName: "card_rarity_enum",
    })
    @IsNotEmpty()
    rarity: CardRarity;

    @ManyToOne(() => Set, (set) => set.cards)
    @JoinColumn({ name: "set_code", referencedColumnName: "code" })
    set: Set;

    @Column({ name: "set_code" })
    @IsString()
    @IsNotEmpty()
    setCode: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    type: string;

    @Column({ unique: true })
    @IsUUID()
    @IsNotEmpty()
    uuid: string;
}
