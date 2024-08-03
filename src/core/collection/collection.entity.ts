import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Card } from '../card/card';

@Entity()
export class Collection {


    // TODO: To be designed


    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    owner: User;

    @OneToMany(() => Card, (card) => card.set)
    cards: Card[];
}
