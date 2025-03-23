import { IsNotEmpty, IsString, IsUUID } from "class-validator";
import { CardRarity } from "src/core/card/api/card.dto";
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
