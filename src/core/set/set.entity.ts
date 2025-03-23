import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Card } from "../card/card.entity";

@Entity()
export class Set {
    @PrimaryColumn()
    code: string;

    @Column()
    baseSize: number;

    @Column({ nullable: true })
    block?: string;

    @OneToMany(() => Card, (card) => card.set)
    cards: Card[];

    @Column()
    keyruneCode: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    parentCode?: string;

    @Column({ type: "date" })
    releaseDate: string;

    @Column()
    type: string;
}
