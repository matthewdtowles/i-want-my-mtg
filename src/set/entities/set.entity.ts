import { Card } from "src/card/entities/card.entity";
import { Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export class Set {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    baseSize: number;

    @Column()
    block?: string;

    @OneToMany(() => Card, (card) => card.set)
    cards: Card[];

    @Column()
    keyruneCode: string;

    @Column()
    name: string;
 
    @Column()
    releaseDate: string;

    @Column()
    setCode: string;

    @Column()
    type: string;
}