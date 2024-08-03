import { CardEntity } from '../card/card.entity';
import { Column, OneToMany, PrimaryColumn } from 'typeorm';

export class SetEntity {

    @PrimaryColumn()
    setCode: string;

    @Column()
    baseSize: number;

    @Column()
    block?: string;

    @OneToMany(() => CardEntity, (card) => card.set)
    cards: CardEntity[];

    @Column()
    keyruneCode: string;

    @Column()
    name: string;
 
    @Column()
    releaseDate: string;

    @Column()
    type: string;
}