import { User } from 'src/core/user/user.entity';
import { Entity, JoinTable, ManyToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Card } from '../card/card.entity';

@Entity()
export class Collection {

    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, user => user.collection, { nullable: false })
    owner: User;

    @ManyToMany(() => Card, { cascade: true })
    @JoinTable()
    cards: Card[];
}
