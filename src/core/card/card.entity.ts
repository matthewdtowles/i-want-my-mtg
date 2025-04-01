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
    PrimaryGeneratedColumn,
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

    @Column()
    @IsString()
    @IsNotEmpty()
    imgSrc: string;

    @Column({ default: false })
    isReserved: boolean;

    @OneToMany(() => Legality, legality => legality.card, { cascade: true })
    legalities: Legality[];

    @Column({ nullable: true })
    manaCost?: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    name: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    number: string;

    @Column({ nullable: true, type: "text" })
    @IsString()
    oracleText?: string;

    @OneToOne(() => Price, (price) => price.card, { cascade: true })
    @JoinColumn({ name: "priceId", referencedColumnName: "id" })
    price: Price;

    @Column({
        type: "enum",
        enum: CardRarity,
        enumName: "card_rarity_enum",
    })
    @IsNotEmpty()
    rarity: CardRarity;

    @ManyToOne(() => Set, (set) => set.cards)
    @JoinColumn({ name: "setCode", referencedColumnName: "code" })
    set: Set;

    @Column()
    @IsString()
    @IsNotEmpty()
    setCode: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    type: string;

    @Column()
    @IsUUID()
    @IsNotEmpty()
    uuid: string;
}
