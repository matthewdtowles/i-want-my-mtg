import { User } from 'src/core/user/user.entity';
import { Entity, JoinTable, ManyToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Card } from '../card/card.entity';

@Entity()
export class Inventory {

    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, user => user.inventory, { nullable: false })
    owner: User;

    @ManyToMany(() => Card, { cascade: true })
    @JoinTable()
    cards: Card[];

    // TODO: create inventoryItem and a inventory is something containgin these items for a user
}