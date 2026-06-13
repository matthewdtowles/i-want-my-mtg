import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { UserOrmEntity } from 'src/database/user/user.orm-entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity('buy_list')
export class BuyListOrmEntity {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @PrimaryColumn({ name: 'card_id' })
    cardId: string;

    @PrimaryColumn({ name: 'foil', type: 'boolean' })
    isFoil: boolean;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @ManyToOne(() => CardOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'card_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_buy_list_card',
    })
    card: CardOrmEntity;

    @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'user_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_buy_list_user',
    })
    user: UserOrmEntity;
}
