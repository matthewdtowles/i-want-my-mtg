import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PublishedDeckOrmEntity } from './published-deck.orm-entity';

@Entity('published_deck_card')
export class PublishedDeckCardOrmEntity {
    @PrimaryColumn({ name: 'published_deck_id' })
    publishedDeckId: number;

    @PrimaryColumn({ name: 'card_id' })
    cardId: string;

    @PrimaryColumn({ name: 'is_sideboard', type: 'boolean' })
    isSideboard: boolean;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @ManyToOne(() => PublishedDeckOrmEntity, (deck) => deck.cards, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'published_deck_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_published_deck_card_deck',
    })
    deck: PublishedDeckOrmEntity;

    @ManyToOne(() => CardOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'card_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_published_deck_card_card',
    })
    card: CardOrmEntity;
}
