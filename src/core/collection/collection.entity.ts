import { Entity, Index, JoinTable, ManyToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Card } from '../card/card.entity';
import { User } from 'src/core/user/user.entity';

@Entity()
export class Collection {

    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, user => user.collection, { nullable: false })
    @Index()
    owner: User;

    @ManyToMany(() => Card, { cascade: true })
    @JoinTable()
    cards: Card[];
}
