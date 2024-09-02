import { User } from 'src/core/user/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Card } from '../card/card.entity';

@Entity()
export class Inventory {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.inventory)
    user: User;

    @ManyToOne(() => Card, card => card)
    card: Card;

    @Column()
    quantity: number;
}