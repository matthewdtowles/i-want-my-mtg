import { IsNotEmpty, IsNumber, IsString, IsUUID } from "class-validator";
import { Legality } from "./legality.entity";
import { Set } from "src/core/set/set.entity";
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class Card {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsString()
    @IsNotEmpty()
    artist: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    imgSrc: string;

    @Column({ default: false })
    isReserved: boolean;

    @OneToMany(() => Legality, (legality) => legality.card, { cascade: true })
    legalities: Legality[];

    @Column({ nullable: true })
    manaCost?: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    name: string;

    @Column()
    @IsNumber()
    @IsNotEmpty()
    number: number;

    @Column({
        nullable: true,
        type: "text",
    })
    @IsString()
    oracleText?: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    rarity: string;

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
