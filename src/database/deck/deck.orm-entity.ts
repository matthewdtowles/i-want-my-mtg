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
    @PrimaryGeneratedColumn({ name: 'id' })
    id: number;

    @Column({ name: 'user_id', type: 'int' })
    userId: number;

    @Column({ name: 'name', type: 'varchar' })
    name: string;

    @Column({
        name: 'format',
        type: 'enum',
        enum: Format,
        enumName: 'format_enum',
        nullable: true,
    })
    format: Format | null;

    @Column({ name: 'description', type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    user: UserOrmEntity;

    @OneToMany(() => DeckCardOrmEntity, (dc) => dc.deck)
    cards: DeckCardOrmEntity[];
}
