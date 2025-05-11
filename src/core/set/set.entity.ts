import { Card } from "src/core/card/card.entity";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";

@Entity()
export class Set {
    @PrimaryColumn()
    code: string;

    @Column({ name: "base_size" })
    baseSize: number;

    @Column({ nullable: true })
    block?: string;

    @OneToMany(() => Card, (card) => card.set)
    cards: Card[];

    @Column({ name: "keyrune_code" })
    keyruneCode: string;

    @Column()
    name: string;

    @Column({ name: "parent_code", nullable: true })
    parentCode?: string;

    @Column({ name: "release_date", type: "date" })
    releaseDate: string;

    @Column()
    type: string;
}
