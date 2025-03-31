import { IsNotEmpty, IsString, IsUUID } from "class-validator";
import { CardRarity } from "./api/card.rarity.enum";
import { Set } from "src/core/set/set.entity";
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from "typeorm";
import { Legality } from "./legality.entity";
import { Price } from "src/core/price/price.entity";

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

    @Column({
        nullable: true,
        type: "text",
    })
    @IsString()
    oracleText?: string;

    // TODO: check for correctness
    @OneToMany(() => Price, (price) => price.card, { cascade: true })
    @JoinColumn({
        name: "prices",
        referencedColumnName: "id",
        foreignKeyConstraintName: "FK_Card_Prices",
    })
    price: Price;

    @Column({
        type: "enum",
        enum: CardRarity,
        enumName: "card_rarity_enum",
    })
    @IsNotEmpty()
    rarity: CardRarity;

    @ManyToOne(() => Set, (set) => set.cards)
    @JoinColumn({
        name: "setCode",
        referencedColumnName: "code",
        foreignKeyConstraintName: "FK_Card_Set",
    })
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
