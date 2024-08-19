import { Column, OneToMany, PrimaryColumn } from 'typeorm';
import { Card } from '../card/card.entity';

export class Set {

    @PrimaryColumn()
    setCode: string;

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
    type: string;
}