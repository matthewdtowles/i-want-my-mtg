import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Card } from '../card/card.entity';

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
