import { User } from 'src/core/user/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Card } from '../card/card.entity';

@Entity()
export class Inventory {

    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Card)
    @JoinColumn({
        name: 'cardId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'FK_Inventory_Card'
    })
    card: Card;

    @Column()
    cardId: number;

    @Column({ default: 1 })
    quantity: number;

    @ManyToOne(() => User, user => user.inventory)
    @JoinColumn({
        name: 'userId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'FK_Inventory_User'
    })
    user: User;

    @Column()
    userId: number;
}