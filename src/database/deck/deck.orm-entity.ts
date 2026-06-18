import { Format } from 'src/core/card/format.enum';
import { UserOrmEntity } from 'src/database/user/user.orm-entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { DeckCardOrmEntity } from './deck-card.orm-entity';

@Entity('deck')
export class DeckOrmEntity {
    @PrimaryGeneratedColumn('identity')
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column()
    name: string;

    @Column({ type: 'enum', enum: Format, enumName: 'format_enum', nullable: true })
    format: Format | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => DeckCardOrmEntity, (dc) => dc.deck, { cascade: true })
    cards: DeckCardOrmEntity[];

    @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'user_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_deck_user',
    })
    user: UserOrmEntity;
}
