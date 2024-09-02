import { User } from 'src/core/user/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Card } from '../card/card.entity';

@Entity()
export class Inventory {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.inventory)
    user: User;

    @OneToOne(() => Card)
    @JoinColumn()
    card: Card;

    @Column({ default: 1 })
    quantity: number;
}