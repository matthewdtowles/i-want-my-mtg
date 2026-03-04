import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { UserOrmEntity } from 'src/database/user/user.orm-entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('transaction')
export class TransactionOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'card_id' })
    cardId: string;

    @Column({ type: 'varchar' })
    type: string;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ name: 'price_per_unit', type: 'numeric', precision: 10, scale: 2 })
    pricePerUnit: number;

    @Column({ name: 'is_foil', type: 'boolean' })
    isFoil: boolean;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'varchar', nullable: true })
    source: string;

    @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
    fees: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @ManyToOne(() => CardOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'card_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'FK_transaction_card',
    })
    card: CardOrmEntity;

    @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'user_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'FK_transaction_user',
    })
    user: UserOrmEntity;
}
