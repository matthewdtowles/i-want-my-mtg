import { Set } from "src/core/set/set.entity";
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class Card {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    artist: string;

    @Column()
    imgSrc: string;

    @Column({ default: false })
    isReserved: boolean;

    @Column({ nullable: true })
    manaCost?: string;

    @Column()
    name: string;

    @Column()
    number: string;

    @Column({
        nullable: true,
        type: "text",
    })
    oracleText?: string;

    @Column()
    rarity: string;

    @ManyToOne(() => Set, (set) => set.cards)
    @JoinColumn({
        name: "setCode",
        referencedColumnName: "code",
        foreignKeyConstraintName: "FK_Card_Set",
    })
    set: Set;

    @Column()
    setCode: string;

    @Column()
    type: string;

    @Column()
    uuid: string;
}
